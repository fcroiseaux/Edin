import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ZenhubConfigService } from './zenhub-config.service.js';
import { SettingsService } from '../settings/settings.service.js';
import type { ZenhubWebhookReceivedEvent } from '@edin/shared';

const ROTATION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class ZenhubWebhookService {
  private readonly logger = new Logger(ZenhubWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly zenhubConfigService: ZenhubConfigService,
    private readonly settingsService: SettingsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async validateSignature(rawBody: Buffer, signature: string): Promise<boolean> {
    const currentSecret = await this.zenhubConfigService.resolveWebhookSecret();

    if (!currentSecret) {
      this.logger.warn('Webhook secret not configured');
      return false;
    }

    // Try current secret first
    if (this.verifyHmac(rawBody, signature, currentSecret)) {
      return true;
    }

    // Try previous secret during rotation window (AC4)
    const previousSecret = await this.settingsService.getSettingValue<string | null>(
      'zenhub.webhook_secret_previous',
      null,
    );

    if (!previousSecret) {
      return false;
    }

    const rotatedAtStr = await this.settingsService.getSettingValue<string | null>(
      'zenhub.webhook_secret_rotated_at',
      null,
    );

    if (!rotatedAtStr) {
      return false;
    }

    const rotatedAt = new Date(rotatedAtStr).getTime();
    const now = Date.now();

    if (now - rotatedAt > ROTATION_WINDOW_MS) {
      this.logger.debug('Previous webhook secret rotation window has expired');
      return false;
    }

    return this.verifyHmac(rawBody, signature, previousSecret);
  }

  async processWebhook(
    eventType: string,
    deliveryId: string,
    payload: Record<string, unknown>,
    correlationId: string,
  ): Promise<void> {
    // Idempotency check (AC3) — use try/create to handle concurrent duplicates atomically
    let syncRecord;
    try {
      syncRecord = await this.prisma.zenhubSync.create({
        data: {
          deliveryId,
          syncType: 'WEBHOOK',
          status: 'RECEIVED',
          eventType,
          payload: payload as never,
          correlationId,
        },
      });
    } catch (error: unknown) {
      // Unique constraint violation on deliveryId means duplicate — graceful handling (AC3/AC5)
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        this.logger.log('Duplicate webhook event ignored', {
          deliveryId,
          eventType,
          correlationId,
          errorCode: 'ZENHUB_WEBHOOK_DUPLICATE_EVENT',
        });
        return;
      }
      throw error;
    }

    this.logger.log('Webhook event received and logged', {
      syncId: syncRecord.id,
      eventType,
      deliveryId,
      correlationId,
    });

    // Emit event for async processing (AC1)
    const event: ZenhubWebhookReceivedEvent = {
      eventType: 'zenhub.webhook.received',
      timestamp: new Date().toISOString(),
      correlationId,
      payload: {
        syncId: syncRecord.id,
        webhookEventType: eventType,
        deliveryId,
      },
    };

    this.eventEmitter.emit('zenhub.webhook.received', event);
  }

  private verifyHmac(rawBody: Buffer, signature: string, secret: string): boolean {
    const expectedHex = createHmac('sha256', secret).update(rawBody).digest('hex');
    const expected = `sha256=${expectedHex}`;

    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      // timingSafeEqual throws if buffers are different lengths
      return false;
    }
  }
}

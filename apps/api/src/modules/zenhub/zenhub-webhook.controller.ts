import { Controller, Post, Req, Headers, HttpStatus, HttpCode, Logger } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { ERROR_CODES } from '@edin/shared';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ZenhubWebhookService } from './zenhub-webhook.service.js';

@Controller({ path: 'webhooks', version: '1' })
export class ZenhubWebhookController {
  private readonly logger = new Logger(ZenhubWebhookController.name);

  constructor(private readonly zenhubWebhookService: ZenhubWebhookService) {}

  @Post('zenhub')
  @Throttle({ default: { ttl: 1000, limit: 100 } })
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Headers('x-zenhub-signature') signature: string | undefined,
    @Headers('x-zenhub-event') eventType: string | undefined,
    @Headers('x-zenhub-delivery') deliveryId: string | undefined,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (!signature || !eventType) {
      throw new DomainException(
        ERROR_CODES.ZENHUB_WEBHOOK_SIGNATURE_INVALID,
        'Missing required webhook headers',
        HttpStatus.BAD_REQUEST,
      );
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new DomainException(
        ERROR_CODES.ZENHUB_WEBHOOK_SIGNATURE_INVALID,
        'Missing request body',
        HttpStatus.BAD_REQUEST,
      );
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody.toString()) as Record<string, unknown>;
    } catch {
      this.logger.warn('Malformed webhook payload received', {
        eventType,
        deliveryId,
        correlationId: req.correlationId,
      });
      throw new DomainException(
        ERROR_CODES.ZENHUB_WEBHOOK_SIGNATURE_INVALID,
        'Malformed webhook payload',
        HttpStatus.BAD_REQUEST,
      );
    }

    const isValid = await this.zenhubWebhookService.validateSignature(rawBody, signature);

    if (!isValid) {
      this.logger.warn('Webhook signature validation failed', {
        eventType,
        deliveryId,
        correlationId: req.correlationId,
      });

      throw new DomainException(
        ERROR_CODES.ZENHUB_WEBHOOK_SIGNATURE_INVALID,
        'Invalid webhook signature',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const correlationId = req.correlationId || deliveryId || 'unknown';

    await this.zenhubWebhookService.processWebhook(
      eventType,
      deliveryId || `auto-${Date.now()}`,
      body,
      correlationId,
    );

    return { status: 'accepted' };
  }
}

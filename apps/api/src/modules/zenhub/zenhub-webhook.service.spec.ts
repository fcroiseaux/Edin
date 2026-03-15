import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHmac } from 'node:crypto';
import { ZenhubWebhookService } from './zenhub-webhook.service.js';
import { ZenhubConfigService } from './zenhub-config.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';

const TEST_SECRET = 'test-webhook-secret-value';
const PREVIOUS_SECRET = 'previous-webhook-secret-value';

function createValidSignature(body: string, secret: string): string {
  const hex = createHmac('sha256', secret).update(Buffer.from(body)).digest('hex');
  return `sha256=${hex}`;
}

const mockPrisma = {
  zenhubSync: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

const mockZenhubConfigService = {
  resolveWebhookSecret: vi.fn(),
};

const mockSettingsService = {
  getSettingValue: vi.fn().mockResolvedValue(null),
};

const mockEventEmitter = {
  emit: vi.fn(),
};

describe('ZenhubWebhookService', () => {
  let service: ZenhubWebhookService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        ZenhubWebhookService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ZenhubConfigService, useValue: mockZenhubConfigService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get(ZenhubWebhookService);
  });

  describe('validateSignature', () => {
    it('returns true for valid HMAC signature', async () => {
      mockZenhubConfigService.resolveWebhookSecret.mockResolvedValue(TEST_SECRET);
      const body = '{"type":"issue_transfer"}';
      const signature = createValidSignature(body, TEST_SECRET);

      const result = await service.validateSignature(Buffer.from(body), signature);

      expect(result).toBe(true);
    });

    it('returns false for invalid HMAC signature', async () => {
      mockZenhubConfigService.resolveWebhookSecret.mockResolvedValue(TEST_SECRET);
      const body = '{"type":"issue_transfer"}';

      const result = await service.validateSignature(Buffer.from(body), 'sha256=invalid');

      expect(result).toBe(false);
    });

    it('returns false when no secret is configured', async () => {
      mockZenhubConfigService.resolveWebhookSecret.mockResolvedValue(null);
      const body = '{"type":"issue_transfer"}';

      const result = await service.validateSignature(Buffer.from(body), 'sha256=anything');

      expect(result).toBe(false);
    });

    it('accepts previous secret during rotation window', async () => {
      mockZenhubConfigService.resolveWebhookSecret.mockResolvedValue('new-secret');
      const body = '{"type":"issue_transfer"}';
      const signature = createValidSignature(body, PREVIOUS_SECRET);

      // Previous secret is set and rotation happened recently
      mockSettingsService.getSettingValue
        .mockResolvedValueOnce(PREVIOUS_SECRET) // webhook_secret_previous
        .mockResolvedValueOnce(new Date().toISOString()); // webhook_secret_rotated_at

      const result = await service.validateSignature(Buffer.from(body), signature);

      expect(result).toBe(true);
    });

    it('rejects previous secret after rotation window expires', async () => {
      mockZenhubConfigService.resolveWebhookSecret.mockResolvedValue('new-secret');
      const body = '{"type":"issue_transfer"}';
      const signature = createValidSignature(body, PREVIOUS_SECRET);

      // Previous secret is set but rotation happened >24h ago
      const expiredDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
      mockSettingsService.getSettingValue
        .mockResolvedValueOnce(PREVIOUS_SECRET) // webhook_secret_previous
        .mockResolvedValueOnce(expiredDate); // webhook_secret_rotated_at

      const result = await service.validateSignature(Buffer.from(body), signature);

      expect(result).toBe(false);
    });
  });

  describe('processWebhook', () => {
    it('creates sync record and emits event for new delivery', async () => {
      mockPrisma.zenhubSync.findUnique.mockResolvedValue(null);
      mockPrisma.zenhubSync.create.mockResolvedValue({
        id: 'sync-uuid-123',
        deliveryId: 'delivery-1',
        eventType: 'issue_transfer',
      });

      await service.processWebhook(
        'issue_transfer',
        'delivery-1',
        { type: 'issue_transfer' },
        'corr-1',
      );

      expect(mockPrisma.zenhubSync.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          deliveryId: 'delivery-1',
          syncType: 'WEBHOOK',
          status: 'RECEIVED',
          eventType: 'issue_transfer',
          correlationId: 'corr-1',
        }),
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'zenhub.webhook.received',
        expect.objectContaining({
          eventType: 'zenhub.webhook.received',
          correlationId: 'corr-1',
          payload: expect.objectContaining({
            syncId: 'sync-uuid-123',
            webhookEventType: 'issue_transfer',
            deliveryId: 'delivery-1',
          }),
        }),
      );
    });

    it('handles concurrent duplicate gracefully via unique constraint (P2002)', async () => {
      const prismaError = new Error('Unique constraint failed');
      Object.assign(prismaError, { code: 'P2002' });
      mockPrisma.zenhubSync.create.mockRejectedValue(prismaError);

      await service.processWebhook(
        'issue_transfer',
        'delivery-dup',
        { type: 'issue_transfer' },
        'corr-2',
      );

      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('rethrows non-duplicate database errors', async () => {
      mockPrisma.zenhubSync.create.mockRejectedValue(new Error('Connection failed'));

      await expect(
        service.processWebhook(
          'issue_transfer',
          'delivery-err',
          { type: 'issue_transfer' },
          'corr-3',
        ),
      ).rejects.toThrow('Connection failed');
    });
  });
});

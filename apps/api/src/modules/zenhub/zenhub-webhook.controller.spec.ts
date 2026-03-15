import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { HttpStatus } from '@nestjs/common';
import { ZenhubWebhookController } from './zenhub-webhook.controller.js';
import { ZenhubWebhookService } from './zenhub-webhook.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

const mockWebhookService = {
  validateSignature: vi.fn(),
  processWebhook: vi.fn(),
};

describe('ZenhubWebhookController', () => {
  let controller: ZenhubWebhookController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
      controllers: [ZenhubWebhookController],
      providers: [{ provide: ZenhubWebhookService, useValue: mockWebhookService }],
    }).compile();

    controller = module.get(ZenhubWebhookController);
  });

  it('rejects missing signature header', async () => {
    await expect(
      controller.receiveWebhook(undefined, 'issue_transfer', 'delivery-1', {
        rawBody: Buffer.from('{}'),
        correlationId: 'test',
      } as never),
    ).rejects.toBeInstanceOf(DomainException);
  });

  it('rejects missing event type header', async () => {
    await expect(
      controller.receiveWebhook('sha256=abc', undefined, 'delivery-1', {
        rawBody: Buffer.from('{}'),
        correlationId: 'test',
      } as never),
    ).rejects.toBeInstanceOf(DomainException);
  });

  it('rejects missing raw body', async () => {
    await expect(
      controller.receiveWebhook('sha256=abc', 'issue_transfer', 'delivery-1', {
        rawBody: undefined,
        correlationId: 'test',
      } as never),
    ).rejects.toBeInstanceOf(DomainException);
  });

  it('rejects invalid signature with 401', async () => {
    const payload = JSON.stringify({ type: 'issue_transfer' });
    mockWebhookService.validateSignature.mockResolvedValue(false);

    try {
      await controller.receiveWebhook('sha256=invalid', 'issue_transfer', 'delivery-1', {
        rawBody: Buffer.from(payload),
        correlationId: 'test',
      } as never);
      expect.unreachable('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainException);
      expect((error as DomainException).getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    }
  });

  it('accepts valid webhook and returns accepted status', async () => {
    const payload = JSON.stringify({ type: 'issue_transfer' });
    mockWebhookService.validateSignature.mockResolvedValue(true);
    mockWebhookService.processWebhook.mockResolvedValue(undefined);

    const result = await controller.receiveWebhook('sha256=valid', 'issue_transfer', 'delivery-1', {
      rawBody: Buffer.from(payload),
      correlationId: 'test-corr',
    } as never);

    expect(result).toEqual({ status: 'accepted' });
    expect(mockWebhookService.processWebhook).toHaveBeenCalledWith(
      'issue_transfer',
      'delivery-1',
      { type: 'issue_transfer' },
      'test-corr',
    );
  });

  it('rejects malformed JSON payload', async () => {
    await expect(
      controller.receiveWebhook('sha256=abc', 'issue_transfer', 'delivery-1', {
        rawBody: Buffer.from('not-json'),
        correlationId: 'test',
      } as never),
    ).rejects.toBeInstanceOf(DomainException);
  });
});

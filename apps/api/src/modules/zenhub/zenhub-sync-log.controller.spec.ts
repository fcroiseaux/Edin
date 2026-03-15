import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ZenhubSyncLogController } from './zenhub-sync-log.controller.js';
import { ZenhubSyncLogService } from './zenhub-sync-log.service.js';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';
import type { ZenhubSyncLogEntry, IntegrationHealthSummary } from '@edin/shared';

const mockLogEntry: ZenhubSyncLogEntry = {
  id: 'sync-1',
  deliveryId: 'del-1',
  syncType: 'WEBHOOK',
  status: 'COMPLETED',
  eventType: 'issue_transfer',
  correlationId: 'corr-1',
  errorMessage: null,
  retryCount: 0,
  receivedAt: '2026-03-15T10:00:00.000Z',
  processedAt: '2026-03-15T10:00:01.000Z',
  payloadSummary: 'issue_transfer',
  durationMs: null,
  recordsSynced: null,
};

const mockHealthSummary: IntegrationHealthSummary = {
  lastSuccessfulPoll: '2026-03-15T10:00:00.000Z',
  lastSuccessfulWebhook: '2026-03-15T09:55:00.000Z',
  webhookSuccessRate: 99.5,
  webhookTotalLast24h: 200,
  webhookFailedLast24h: 1,
  pollingAvgDurationMs: 2500,
  overallStatus: 'healthy',
};

const mockService = {
  getSyncLogs: vi.fn().mockResolvedValue({
    data: [mockLogEntry],
    pagination: { cursor: null, hasMore: false },
  }),
  getHealthSummary: vi.fn().mockResolvedValue(mockHealthSummary),
};

describe('ZenhubSyncLogController', () => {
  let controller: ZenhubSyncLogController;

  const mockRequest = { correlationId: 'test-corr' } as never;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [ZenhubSyncLogController],
      providers: [
        { provide: ZenhubSyncLogService, useValue: mockService },
        { provide: CaslAbilityFactory, useValue: {} },
      ],
    }).compile();

    controller = module.get(ZenhubSyncLogController);
  });

  describe('getSyncLogs', () => {
    it('returns logs in success envelope', async () => {
      const result = await controller.getSyncLogs({}, mockRequest);

      expect(result.data).toEqual([mockLogEntry]);
      expect(result.meta.correlationId).toBe('test-corr');
      expect(result.meta.pagination).toEqual({ cursor: null, hasMore: false });
      expect(mockService.getSyncLogs).toHaveBeenCalled();
    });

    it('passes validated filters to service', async () => {
      const query = { syncType: 'WEBHOOK', status: 'FAILED', limit: '10' };
      await controller.getSyncLogs(query, mockRequest);

      expect(mockService.getSyncLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          syncType: 'WEBHOOK',
          status: 'FAILED',
          limit: 10,
        }),
      );
    });

    it('rejects invalid query parameters', async () => {
      const query = { syncType: 'INVALID_TYPE' };

      await expect(controller.getSyncLogs(query, mockRequest)).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
      });
    });
  });

  describe('getHealthSummary', () => {
    it('returns health summary in success envelope', async () => {
      const result = await controller.getHealthSummary(mockRequest);

      expect(result.data).toEqual(mockHealthSummary);
      expect(result.meta.correlationId).toBe('test-corr');
      expect(mockService.getHealthSummary).toHaveBeenCalled();
    });
  });
});

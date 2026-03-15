import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ZenhubSyncLogService } from './zenhub-sync-log.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

function makeSyncRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sync-1',
    deliveryId: 'del-1',
    syncType: 'WEBHOOK',
    status: 'COMPLETED',
    eventType: 'issue_transfer',
    payload: null,
    correlationId: 'corr-1',
    errorMessage: null,
    retryCount: 0,
    receivedAt: new Date('2026-03-15T10:00:00Z'),
    processedAt: new Date('2026-03-15T10:00:01Z'),
    createdAt: new Date('2026-03-15T10:00:00Z'),
    updatedAt: new Date('2026-03-15T10:00:01Z'),
    ...overrides,
  };
}

const mockPrisma = {
  zenhubSync: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
  },
};

describe('ZenhubSyncLogService', () => {
  let service: ZenhubSyncLogService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [ZenhubSyncLogService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get(ZenhubSyncLogService);
  });

  describe('getSyncLogs', () => {
    it('returns paginated webhook logs', async () => {
      const records = [makeSyncRecord({ id: 'sync-1' }), makeSyncRecord({ id: 'sync-2' })];
      mockPrisma.zenhubSync.findMany.mockResolvedValue(records);

      const result = await service.getSyncLogs({ limit: 25 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].id).toBe('sync-1');
      expect(result.data[0].syncType).toBe('WEBHOOK');
      expect(result.data[0].receivedAt).toBe('2026-03-15T10:00:00.000Z');
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.cursor).toBeNull();
    });

    it('returns paginated poll logs with payload summary', async () => {
      const records = [
        makeSyncRecord({
          id: 'poll-1',
          syncType: 'POLL',
          eventType: 'poll.sync',
          payload: { sprintCount: 5, issueCount: 20, durationMs: 1500 },
        }),
      ];
      mockPrisma.zenhubSync.findMany.mockResolvedValue(records);

      const result = await service.getSyncLogs({ limit: 25 });

      expect(result.data[0].payloadSummary).toBe('5 sprints, 20 issues');
      expect(result.data[0].durationMs).toBe(1500);
      expect(result.data[0].recordsSynced).toBe(25);
    });

    it('filters by status', async () => {
      mockPrisma.zenhubSync.findMany.mockResolvedValue([]);

      await service.getSyncLogs({ limit: 25, status: 'FAILED' });

      expect(mockPrisma.zenhubSync.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'FAILED' }),
        }),
      );
    });

    it('filters by syncType', async () => {
      mockPrisma.zenhubSync.findMany.mockResolvedValue([]);

      await service.getSyncLogs({ limit: 25, syncType: 'WEBHOOK' });

      expect(mockPrisma.zenhubSync.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ syncType: 'WEBHOOK' }),
        }),
      );
    });

    it('filters by date range', async () => {
      mockPrisma.zenhubSync.findMany.mockResolvedValue([]);

      await service.getSyncLogs({
        limit: 25,
        startDate: '2026-03-14T00:00:00Z',
        endDate: '2026-03-15T00:00:00Z',
      });

      expect(mockPrisma.zenhubSync.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            receivedAt: {
              gte: new Date('2026-03-14T00:00:00Z'),
              lte: new Date('2026-03-15T00:00:00Z'),
            },
          }),
        }),
      );
    });

    it('returns safe payload summary without secrets', async () => {
      const records = [
        makeSyncRecord({
          syncType: 'WEBHOOK',
          payload: { type: 'issue_transfer', secret: 'should-be-hidden', apiToken: 'xxx' },
        }),
      ];
      mockPrisma.zenhubSync.findMany.mockResolvedValue(records);

      const result = await service.getSyncLogs({ limit: 25 });

      // Webhook payload summary is just eventType
      expect(result.data[0].payloadSummary).toBe('issue_transfer');
      // Raw payload should never be exposed in the response
      expect(JSON.stringify(result.data[0])).not.toContain('should-be-hidden');
      expect(JSON.stringify(result.data[0])).not.toContain('xxx');
    });

    it('handles cursor pagination correctly', async () => {
      // Return limit+1 to indicate hasMore
      const records = Array.from({ length: 4 }, (_, i) => makeSyncRecord({ id: `sync-${i}` }));
      mockPrisma.zenhubSync.findMany.mockResolvedValue(records);

      const result = await service.getSyncLogs({ limit: 3, cursor: 'prev-cursor' });

      expect(result.data).toHaveLength(3);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.cursor).toBe('sync-2');
      expect(mockPrisma.zenhubSync.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1,
          cursor: { id: 'prev-cursor' },
        }),
      );
    });
  });

  describe('getHealthSummary', () => {
    it('returns correct webhook success rate', async () => {
      mockPrisma.zenhubSync.findFirst
        .mockResolvedValueOnce({ receivedAt: new Date() }) // lastSuccessfulPoll
        .mockResolvedValueOnce({ receivedAt: new Date() }); // lastSuccessfulWebhook
      mockPrisma.zenhubSync.count
        .mockResolvedValueOnce(100) // webhookTotal24h
        .mockResolvedValueOnce(5); // webhookFailed24h
      mockPrisma.zenhubSync.findMany.mockResolvedValue([]); // recentCompletedPolls

      const health = await service.getHealthSummary();

      expect(health.webhookSuccessRate).toBe(95);
      expect(health.webhookTotalLast24h).toBe(100);
      expect(health.webhookFailedLast24h).toBe(5);
    });

    it('returns last successful poll timestamp', async () => {
      const pollDate = new Date('2026-03-15T09:00:00Z');
      mockPrisma.zenhubSync.findFirst
        .mockResolvedValueOnce({ receivedAt: pollDate }) // lastSuccessfulPoll
        .mockResolvedValueOnce(null); // lastSuccessfulWebhook
      mockPrisma.zenhubSync.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      mockPrisma.zenhubSync.findMany.mockResolvedValue([]);

      const health = await service.getHealthSummary();

      expect(health.lastSuccessfulPoll).toBe('2026-03-15T09:00:00.000Z');
      expect(health.lastSuccessfulWebhook).toBeNull();
    });

    it('returns healthy status when conditions met', async () => {
      const recentDate = new Date(); // Just now
      mockPrisma.zenhubSync.findFirst
        .mockResolvedValueOnce({ receivedAt: recentDate })
        .mockResolvedValueOnce({ receivedAt: recentDate });
      mockPrisma.zenhubSync.count.mockResolvedValueOnce(100).mockResolvedValueOnce(0); // 0 failures = 100% rate
      mockPrisma.zenhubSync.findMany.mockResolvedValue([
        { payload: { durationMs: 2000 } },
        { payload: { durationMs: 3000 } },
      ]);

      const health = await service.getHealthSummary();

      expect(health.overallStatus).toBe('healthy');
      expect(health.pollingAvgDurationMs).toBe(2500);
    });

    it('returns degraded status when rate drops', async () => {
      const thirtyFiveMinAgo = new Date(Date.now() - 35 * 60 * 1000);
      mockPrisma.zenhubSync.findFirst
        .mockResolvedValueOnce({ receivedAt: thirtyFiveMinAgo })
        .mockResolvedValueOnce(null);
      mockPrisma.zenhubSync.count.mockResolvedValueOnce(100).mockResolvedValueOnce(5); // 95% rate — below 99 threshold for healthy
      mockPrisma.zenhubSync.findMany.mockResolvedValue([]);

      const health = await service.getHealthSummary();

      expect(health.overallStatus).toBe('degraded');
    });

    it('returns down when no recent activity', async () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      mockPrisma.zenhubSync.findFirst
        .mockResolvedValueOnce({ receivedAt: twoHoursAgo })
        .mockResolvedValueOnce(null);
      mockPrisma.zenhubSync.count.mockResolvedValueOnce(10).mockResolvedValueOnce(8); // 20% success
      mockPrisma.zenhubSync.findMany.mockResolvedValue([]);

      const health = await service.getHealthSummary();

      expect(health.overallStatus).toBe('down');
    });
  });
});

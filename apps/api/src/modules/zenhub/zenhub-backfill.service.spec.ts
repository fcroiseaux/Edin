import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ZenhubBackfillService } from './zenhub-backfill.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const mockPrisma = {
  zenhubSync: {
    create: vi.fn(),
    findFirst: vi.fn(),
  },
};

const mockQueue = {
  add: vi.fn(),
};

describe('ZenhubBackfillService', () => {
  let service: ZenhubBackfillService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        ZenhubBackfillService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('zenhub-polling'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get(ZenhubBackfillService);
  });

  describe('triggerBackfill', () => {
    it('creates BACKFILL sync record and enqueues job', async () => {
      mockPrisma.zenhubSync.create.mockResolvedValue({
        id: 'sync-bf-1',
        deliveryId: 'backfill-123',
      });
      mockQueue.add.mockResolvedValue({ id: 'job-bf-1' });

      const result = await service.triggerBackfill('admin-1', 'corr-1');

      expect(mockPrisma.zenhubSync.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          syncType: 'BACKFILL',
          status: 'RECEIVED',
          eventType: 'backfill.manual',
          correlationId: 'corr-1',
        }),
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'backfillHistoricalData',
        expect.objectContaining({
          correlationId: 'corr-1',
          triggeredBy: 'manual',
          syncId: 'sync-bf-1',
        }),
        expect.objectContaining({
          attempts: 3,
          removeOnComplete: true,
        }),
      );

      expect(result).toEqual({ jobId: 'job-bf-1', syncId: 'sync-bf-1' });
    });
  });

  describe('getBackfillStatus', () => {
    it('returns latest BACKFILL sync status', async () => {
      mockPrisma.zenhubSync.findFirst.mockResolvedValue({
        id: 'sync-bf-2',
        status: 'COMPLETED',
        syncType: 'BACKFILL',
        payload: { sprintCount: 5 },
        errorMessage: null,
        receivedAt: new Date('2026-03-15T10:00:00Z'),
        processedAt: new Date('2026-03-15T10:01:00Z'),
      });

      const status = await service.getBackfillStatus();

      expect(status).toEqual(
        expect.objectContaining({
          syncId: 'sync-bf-2',
          status: 'COMPLETED',
          syncType: 'BACKFILL',
        }),
      );
      expect(mockPrisma.zenhubSync.findFirst).toHaveBeenCalledWith({
        where: { syncType: 'BACKFILL' },
        orderBy: { receivedAt: 'desc' },
      });
    });

    it('returns null when no backfill exists', async () => {
      mockPrisma.zenhubSync.findFirst.mockResolvedValue(null);

      const status = await service.getBackfillStatus();

      expect(status).toBeNull();
    });
  });
});

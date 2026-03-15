import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { ZenhubBackfillController } from './zenhub-backfill.controller.js';
import { ZenhubBackfillService } from './zenhub-backfill.service.js';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';

const mockBackfillService = {
  triggerBackfill: vi.fn(),
  getBackfillStatus: vi.fn(),
};

describe('ZenhubBackfillController', () => {
  let controller: ZenhubBackfillController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
      controllers: [ZenhubBackfillController],
      providers: [
        { provide: ZenhubBackfillService, useValue: mockBackfillService },
        CaslAbilityFactory,
        Reflector,
        AbilityGuard,
      ],
    }).compile();

    controller = module.get(ZenhubBackfillController);
  });

  describe('triggerBackfill', () => {
    it('triggers backfill and returns jobId/syncId', async () => {
      mockBackfillService.triggerBackfill.mockResolvedValue({
        jobId: 'job-1',
        syncId: 'sync-1',
      });

      const result = await controller.triggerBackfill({}, 'admin-1', {
        correlationId: 'corr-1',
      } as never);

      expect(result.data).toEqual({ jobId: 'job-1', syncId: 'sync-1' });
      expect(mockBackfillService.triggerBackfill).toHaveBeenCalledWith(
        'admin-1',
        'corr-1',
        undefined,
        undefined,
      );
    });

    it('accepts optional date range', async () => {
      mockBackfillService.triggerBackfill.mockResolvedValue({
        jobId: 'job-2',
        syncId: 'sync-2',
      });

      const result = await controller.triggerBackfill(
        { startDate: '2026-03-01', endDate: '2026-03-15' },
        'admin-1',
        { correlationId: 'corr-2' } as never,
      );

      expect(result.data).toEqual({ jobId: 'job-2', syncId: 'sync-2' });
      expect(mockBackfillService.triggerBackfill).toHaveBeenCalledWith(
        'admin-1',
        'corr-2',
        expect.any(Date),
        expect.any(Date),
      );
    });
  });

  describe('getBackfillStatus', () => {
    it('returns latest backfill status', async () => {
      const mockStatus = {
        syncId: 'sync-3',
        status: 'COMPLETED',
        syncType: 'BACKFILL',
        payload: { sprintCount: 10 },
        errorMessage: null,
        receivedAt: new Date(),
        processedAt: new Date(),
      };
      mockBackfillService.getBackfillStatus.mockResolvedValue(mockStatus);

      const result = await controller.getBackfillStatus({
        correlationId: 'corr-3',
      } as never);

      expect(result.data).toEqual(mockStatus);
    });
  });
});

/* eslint-disable @typescript-eslint/no-unsafe-call */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { TrajectoryController } from './trajectory.controller.js';
import { TrajectoryService } from './trajectory.service.js';

describe('TrajectoryController', () => {
  let controller: TrajectoryController;
  let mockTrajectoryService: any;

  const mockReq = { correlationId: 'test-corr-id' } as any;

  beforeEach(async () => {
    mockTrajectoryService = {
      getTrajectory: vi.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [TrajectoryController],
      providers: [{ provide: TrajectoryService, useValue: mockTrajectoryService }],
    }).compile();

    controller = module.get(TrajectoryController);
  });

  describe('getTrajectory', () => {
    it('should return trajectory data with default time range', async () => {
      const trajectoryResult = {
        points: [
          {
            date: '2025-10-01T00:00:00.000Z',
            rawScore: 75,
            compoundingMultiplier: 1.4,
            compoundedScore: 105,
            contributionCount: 5,
            trend: 'STABLE',
            isProjected: false,
          },
        ],
        summary: {
          currentMultiplier: 1.8,
          tenureMonths: 3,
          overallTrend: 'STABLE',
          totalContributions: 5,
        },
        projected: [],
        hasMore: false,
        nextCursor: null,
      };

      mockTrajectoryService.getTrajectory.mockResolvedValue(trajectoryResult);

      const result = await controller.getTrajectory(
        'user-1',
        undefined,
        undefined,
        undefined,
        mockReq,
      );

      expect(result.data.points).toHaveLength(1);
      expect(result.data.summary.currentMultiplier).toBe(1.8);
      expect(result.data.projected).toHaveLength(0);
      expect(result.meta.pagination?.hasMore).toBe(false);
      expect(mockTrajectoryService.getTrajectory).toHaveBeenCalledWith(
        'user-1',
        'year',
        undefined,
        50,
      );
    });

    it('should pass time range to service', async () => {
      mockTrajectoryService.getTrajectory.mockResolvedValue({
        points: [],
        summary: {
          currentMultiplier: 1,
          tenureMonths: 0,
          overallTrend: 'STABLE',
          totalContributions: 0,
        },
        projected: [],
        hasMore: false,
        nextCursor: null,
      });

      await controller.getTrajectory('user-1', '30d', undefined, undefined, mockReq);

      expect(mockTrajectoryService.getTrajectory).toHaveBeenCalledWith(
        'user-1',
        '30d',
        undefined,
        50,
      );
    });

    it('should reject invalid time range', async () => {
      await expect(
        controller.getTrajectory('user-1', 'invalid', undefined, undefined, mockReq),
      ).rejects.toThrow('Invalid time range');
    });

    it('should reject invalid cursor date', async () => {
      await expect(
        controller.getTrajectory('user-1', 'year', 'not-a-date', undefined, mockReq),
      ).rejects.toThrow('Invalid cursor');
    });

    it('should clamp limit to valid range', async () => {
      mockTrajectoryService.getTrajectory.mockResolvedValue({
        points: [],
        summary: {
          currentMultiplier: 1,
          tenureMonths: 0,
          overallTrend: 'STABLE',
          totalContributions: 0,
        },
        projected: [],
        hasMore: false,
        nextCursor: null,
      });

      await controller.getTrajectory('user-1', 'year', undefined, '500', mockReq);

      expect(mockTrajectoryService.getTrajectory).toHaveBeenCalledWith(
        'user-1',
        'year',
        undefined,
        200,
      );
    });
  });
});

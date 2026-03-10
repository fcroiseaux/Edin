/* eslint-disable @typescript-eslint/no-unsafe-call */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { TrajectoryService } from './trajectory.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('TrajectoryService', () => {
  let service: TrajectoryService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      contributionScore: {
        findFirst: vi.fn(),
      },
      temporalScoreAggregate: {
        findMany: vi.fn(),
      },
    };

    const module = await Test.createTestingModule({
      providers: [TrajectoryService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get(TrajectoryService);
  });

  describe('getTrajectory', () => {
    it('should return empty points when no aggregates exist', async () => {
      mockPrisma.contributionScore.findFirst.mockResolvedValue(null);
      mockPrisma.temporalScoreAggregate.findMany.mockResolvedValue([]);

      const result = await service.getTrajectory('contributor-1', 'year');

      expect(result.points).toHaveLength(0);
      expect(result.projected).toHaveLength(0);
      expect(result.summary.totalContributions).toBe(0);
      expect(result.summary.overallTrend).toBe('STABLE');
      expect(result.hasMore).toBe(false);
    });

    it('should compute trajectory points with compounding multiplier', async () => {
      const firstContributionDate = new Date('2025-09-01');
      mockPrisma.contributionScore.findFirst.mockResolvedValue({
        createdAt: firstContributionDate,
      });

      // 3 monthly aggregates
      mockPrisma.temporalScoreAggregate.findMany.mockResolvedValue([
        {
          id: 'agg-1',
          contributorId: 'contributor-1',
          horizon: 'MONTHLY',
          periodStart: new Date('2025-10-01'),
          periodEnd: new Date('2025-11-01'),
          aggregatedScore: 75,
          contributionCount: 5,
          trend: 'STABLE',
          computedAt: new Date(),
        },
        {
          id: 'agg-2',
          contributorId: 'contributor-1',
          horizon: 'MONTHLY',
          periodStart: new Date('2025-11-01'),
          periodEnd: new Date('2025-12-01'),
          aggregatedScore: 80,
          contributionCount: 7,
          trend: 'RISING',
          computedAt: new Date(),
        },
        {
          id: 'agg-3',
          contributorId: 'contributor-1',
          horizon: 'MONTHLY',
          periodStart: new Date('2025-12-01'),
          periodEnd: new Date('2026-01-01'),
          aggregatedScore: 78,
          contributionCount: 6,
          trend: 'STABLE',
          computedAt: new Date(),
        },
      ]);

      const result = await service.getTrajectory('contributor-1', 'year');

      expect(result.points).toHaveLength(3);
      // Each point should have a compounding multiplier > 1 (tenure > 1 month)
      result.points.forEach((point) => {
        expect(point.compoundingMultiplier).toBeGreaterThanOrEqual(1.0);
        expect(point.compoundedScore).toBe(
          Math.round(point.rawScore * point.compoundingMultiplier * 100) / 100,
        );
        expect(point.isProjected).toBe(false);
      });
    });

    it('should generate projected trajectory from last 3 periods', async () => {
      mockPrisma.contributionScore.findFirst.mockResolvedValue({
        createdAt: new Date('2025-06-01'),
      });

      mockPrisma.temporalScoreAggregate.findMany.mockResolvedValue([
        {
          id: 'agg-1',
          contributorId: 'c-1',
          horizon: 'MONTHLY',
          periodStart: new Date('2025-10-01'),
          periodEnd: new Date('2025-11-01'),
          aggregatedScore: 70,
          contributionCount: 4,
          trend: 'STABLE',
          computedAt: new Date(),
        },
        {
          id: 'agg-2',
          contributorId: 'c-1',
          horizon: 'MONTHLY',
          periodStart: new Date('2025-11-01'),
          periodEnd: new Date('2025-12-01'),
          aggregatedScore: 75,
          contributionCount: 5,
          trend: 'RISING',
          computedAt: new Date(),
        },
        {
          id: 'agg-3',
          contributorId: 'c-1',
          horizon: 'MONTHLY',
          periodStart: new Date('2025-12-01'),
          periodEnd: new Date('2026-01-01'),
          aggregatedScore: 80,
          contributionCount: 6,
          trend: 'RISING',
          computedAt: new Date(),
        },
      ]);

      const result = await service.getTrajectory('c-1', 'year');

      expect(result.projected.length).toBeGreaterThan(0);
      expect(result.projected.length).toBe(3); // MONTHLY horizon projects 3 periods
      result.projected.forEach((point) => {
        expect(point.isProjected).toBe(true);
        expect(point.compoundingMultiplier).toBeGreaterThan(0);
      });
    });

    it('should not project when fewer than 2 data points', async () => {
      mockPrisma.contributionScore.findFirst.mockResolvedValue({
        createdAt: new Date('2025-12-01'),
      });

      mockPrisma.temporalScoreAggregate.findMany.mockResolvedValue([
        {
          id: 'agg-1',
          contributorId: 'c-1',
          horizon: 'MONTHLY',
          periodStart: new Date('2025-12-01'),
          periodEnd: new Date('2026-01-01'),
          aggregatedScore: 65,
          contributionCount: 3,
          trend: 'STABLE',
          computedAt: new Date(),
        },
      ]);

      const result = await service.getTrajectory('c-1', 'year');

      expect(result.points).toHaveLength(1);
      expect(result.projected).toHaveLength(0);
    });

    it('should handle cursor-based pagination', async () => {
      mockPrisma.contributionScore.findFirst.mockResolvedValue({
        createdAt: new Date('2025-01-01'),
      });

      // Return limit+1 items to indicate hasMore
      const aggregates = Array.from({ length: 4 }, (_, i) => ({
        id: `agg-${i}`,
        contributorId: 'c-1',
        horizon: 'MONTHLY',
        periodStart: new Date(2025, i, 1),
        periodEnd: new Date(2025, i + 1, 1),
        aggregatedScore: 70 + i,
        contributionCount: 3 + i,
        trend: 'STABLE',
        computedAt: new Date(),
      }));

      mockPrisma.temporalScoreAggregate.findMany.mockResolvedValue(aggregates);

      const result = await service.getTrajectory('c-1', 'year', undefined, 3);

      expect(result.hasMore).toBe(true);
      expect(result.points).toHaveLength(3); // limited to 3
      expect(result.nextCursor).not.toBeNull();
    });

    it('should use DAILY horizon for 30d time range', async () => {
      mockPrisma.contributionScore.findFirst.mockResolvedValue(null);
      mockPrisma.temporalScoreAggregate.findMany.mockResolvedValue([]);

      await service.getTrajectory('c-1', '30d');

      expect(mockPrisma.temporalScoreAggregate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            horizon: 'DAILY',
          }),
        }),
      );
    });

    it('should use WEEKLY horizon for quarter time range', async () => {
      mockPrisma.contributionScore.findFirst.mockResolvedValue(null);
      mockPrisma.temporalScoreAggregate.findMany.mockResolvedValue([]);

      await service.getTrajectory('c-1', 'quarter');

      expect(mockPrisma.temporalScoreAggregate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            horizon: 'WEEKLY',
          }),
        }),
      );
    });

    it('should use MONTHLY horizon for year time range', async () => {
      mockPrisma.contributionScore.findFirst.mockResolvedValue(null);
      mockPrisma.temporalScoreAggregate.findMany.mockResolvedValue([]);

      await service.getTrajectory('c-1', 'year');

      expect(mockPrisma.temporalScoreAggregate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            horizon: 'MONTHLY',
          }),
        }),
      );
    });
  });

  describe('interpolateMultiplier', () => {
    it('should return 1.0 for zero tenure', () => {
      expect(service.interpolateMultiplier(0)).toBe(1.0);
    });

    it('should return exact values at defined curve points', () => {
      expect(service.interpolateMultiplier(1)).toBe(1.0);
      expect(service.interpolateMultiplier(3)).toBe(1.8);
      expect(service.interpolateMultiplier(6)).toBe(3.2);
      expect(service.interpolateMultiplier(12)).toBe(6.5);
      expect(service.interpolateMultiplier(24)).toBe(14.0);
    });

    it('should interpolate linearly between defined points', () => {
      // Midpoint between 1 month (1.0x) and 3 months (1.8x) = 2 months → 1.4x
      const twoMonthMultiplier = service.interpolateMultiplier(2);
      expect(twoMonthMultiplier).toBeCloseTo(1.4, 1);
    });

    it('should cap at maximum for tenure beyond curve', () => {
      expect(service.interpolateMultiplier(36)).toBe(14.0);
      expect(service.interpolateMultiplier(100)).toBe(14.0);
    });
  });

  describe('calculateTenureMonths', () => {
    it('should calculate correct tenure in months', () => {
      const start = new Date('2025-01-01');
      const end = new Date('2025-07-01');
      expect(service.calculateTenureMonths(start, end)).toBe(6);
    });

    it('should return 0 for same date', () => {
      const d = new Date('2025-06-15');
      expect(service.calculateTenureMonths(d, d)).toBe(0);
    });

    it('should handle partial months', () => {
      const start = new Date('2025-01-01');
      const end = new Date('2025-01-16');
      expect(service.calculateTenureMonths(start, end)).toBeCloseTo(0.5, 0);
    });
  });

  describe('getHorizonForTimeRange', () => {
    it('should map 30d to DAILY', () => {
      expect(service.getHorizonForTimeRange('30d')).toBe('DAILY');
    });

    it('should map quarter to WEEKLY', () => {
      expect(service.getHorizonForTimeRange('quarter')).toBe('WEEKLY');
    });

    it('should map year to MONTHLY', () => {
      expect(service.getHorizonForTimeRange('year')).toBe('MONTHLY');
    });

    it('should map all to MONTHLY', () => {
      expect(service.getHorizonForTimeRange('all')).toBe('MONTHLY');
    });
  });
});

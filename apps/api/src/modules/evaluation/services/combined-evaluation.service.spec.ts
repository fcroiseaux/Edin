import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CombinedEvaluationService } from './combined-evaluation.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { ZenhubConfigService } from '../../zenhub/zenhub-config.service.js';
import type { EvaluationCompletedEvent } from '@edin/shared';

const CONTRIBUTOR_ID = 'contributor-uuid-1';
const EVALUATION_ID = 'eval-uuid-1';

const mockPrisma = {
  planningReliability: {
    findMany: vi.fn(),
  },
  evaluation: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

const mockZenhubConfigService = {
  resolveCombinedScoreEnabled: vi.fn(),
  resolveQualityWeight: vi.fn(),
  resolvePlanningWeight: vi.fn(),
};

function createReliabilityRecord(overrides: {
  sprintId: string;
  deliveryRatio: number | null;
  estimationVariance: number | null;
}) {
  return {
    id: `rel-${overrides.sprintId}`,
    contributorId: CONTRIBUTOR_ID,
    sprintId: overrides.sprintId,
    committedPoints: 10,
    deliveredPoints: 8,
    deliveryRatio: overrides.deliveryRatio,
    estimationVariance: overrides.estimationVariance,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('CombinedEvaluationService', () => {
  let service: CombinedEvaluationService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        CombinedEvaluationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ZenhubConfigService, useValue: mockZenhubConfigService },
      ],
    }).compile();

    service = module.get(CombinedEvaluationService);

    // Default config values
    mockZenhubConfigService.resolveCombinedScoreEnabled.mockResolvedValue(true);
    mockZenhubConfigService.resolveQualityWeight.mockResolvedValue(0.8);
    mockZenhubConfigService.resolvePlanningWeight.mockResolvedValue(0.2);
  });

  describe('computePlanningReliabilityScore', () => {
    it('should return null when no planning reliability data exists', async () => {
      mockPrisma.planningReliability.findMany.mockResolvedValue([]);

      const result = await service.computePlanningReliabilityScore(CONTRIBUTOR_ID);
      expect(result).toBeNull();
    });

    it('should compute correct score from multi-sprint data', async () => {
      mockPrisma.planningReliability.findMany.mockResolvedValue([
        createReliabilityRecord({ sprintId: 's1', deliveryRatio: 0.8, estimationVariance: 20 }),
        createReliabilityRecord({ sprintId: 's2', deliveryRatio: 0.9, estimationVariance: 10 }),
        createReliabilityRecord({ sprintId: 's3', deliveryRatio: 0.85, estimationVariance: 15 }),
      ]);

      const result = await service.computePlanningReliabilityScore(CONTRIBUTOR_ID);
      expect(result).not.toBeNull();
      expect(result!.sprintCount).toBe(3);
      expect(result!.confidenceFactor).toBe(1.0);
      expect(result!.score).toBeGreaterThan(0);
      expect(result!.score).toBeLessThanOrEqual(100);

      // Delivery ratio score: avg(0.8, 0.9, 0.85) = 0.85 → 85
      expect(result!.deliveryRatioScore).toBeCloseTo(85, 0);
      // Estimation accuracy: 100 - avg(20, 10, 15) = 100 - 15 = 85
      expect(result!.estimationAccuracyScore).toBeCloseTo(85, 0);
      // Consistency: stddev of [0.8, 0.9, 0.85] is small → high score
      expect(result!.consistencyScore).toBeGreaterThan(90);
    });

    it('should return reduced confidence factor for sparse data (1 sprint)', async () => {
      mockPrisma.planningReliability.findMany.mockResolvedValue([
        createReliabilityRecord({ sprintId: 's1', deliveryRatio: 0.9, estimationVariance: 10 }),
      ]);

      const result = await service.computePlanningReliabilityScore(CONTRIBUTOR_ID);
      expect(result).not.toBeNull();
      expect(result!.sprintCount).toBe(1);
      expect(result!.confidenceFactor).toBeCloseTo(0.333, 2);
    });

    it('should return reduced confidence factor for 2 sprints', async () => {
      mockPrisma.planningReliability.findMany.mockResolvedValue([
        createReliabilityRecord({ sprintId: 's1', deliveryRatio: 0.8, estimationVariance: 20 }),
        createReliabilityRecord({ sprintId: 's2', deliveryRatio: 0.9, estimationVariance: 10 }),
      ]);

      const result = await service.computePlanningReliabilityScore(CONTRIBUTOR_ID);
      expect(result).not.toBeNull();
      expect(result!.sprintCount).toBe(2);
      expect(result!.confidenceFactor).toBeCloseTo(0.667, 2);
    });

    it('should handle records with null ratios and variances', async () => {
      mockPrisma.planningReliability.findMany.mockResolvedValue([
        createReliabilityRecord({ sprintId: 's1', deliveryRatio: null, estimationVariance: null }),
        createReliabilityRecord({ sprintId: 's2', deliveryRatio: 0.8, estimationVariance: 20 }),
      ]);

      const result = await service.computePlanningReliabilityScore(CONTRIBUTOR_ID);
      expect(result).not.toBeNull();
      expect(result!.sprintCount).toBe(2);
      // Only 1 valid ratio, so avg is based on that single value
      expect(result!.deliveryRatioScore).toBeCloseTo(80, 0);
    });

    it('should clamp scores to 0–100 for extreme values', async () => {
      mockPrisma.planningReliability.findMany.mockResolvedValue([
        createReliabilityRecord({ sprintId: 's1', deliveryRatio: 1.5, estimationVariance: 150 }),
      ]);

      const result = await service.computePlanningReliabilityScore(CONTRIBUTOR_ID);
      expect(result).not.toBeNull();
      // deliveryRatio 1.5 × 100 = 150, clamped to 100
      expect(result!.deliveryRatioScore).toBe(100);
      // 100 - 150 = -50, clamped to 0
      expect(result!.estimationAccuracyScore).toBe(0);
    });
  });

  describe('computeCombinedScore', () => {
    it('should return null when feature flag is disabled', async () => {
      mockZenhubConfigService.resolveCombinedScoreEnabled.mockResolvedValue(false);

      const result = await service.computeCombinedScore(EVALUATION_ID);
      expect(result).toBeNull();
    });

    it('should return null when evaluation is not found', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue(null);

      const result = await service.computeCombinedScore(EVALUATION_ID);
      expect(result).toBeNull();
    });

    it('should return quality-only score when no planning data exists', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue({
        compositeScore: { toNumber: () => 75 },
        contributorId: CONTRIBUTOR_ID,
        status: 'COMPLETED',
      });
      mockPrisma.planningReliability.findMany.mockResolvedValue([]);

      const result = await service.computeCombinedScore(EVALUATION_ID);
      expect(result).not.toBeNull();
      expect(result!.planningReliabilityIncluded).toBe(false);
      expect(result!.combinedScore).toBe(75);
      expect(result!.effectiveWeights.quality).toBe(1.0);
      expect(result!.effectiveWeights.planning).toBe(0);
    });

    it('should apply configurable weights correctly', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue({
        compositeScore: { toNumber: () => 80 },
        contributorId: CONTRIBUTOR_ID,
        status: 'COMPLETED',
      });
      // 3 sprints → full confidence
      mockPrisma.planningReliability.findMany.mockResolvedValue([
        createReliabilityRecord({ sprintId: 's1', deliveryRatio: 1.0, estimationVariance: 0 }),
        createReliabilityRecord({ sprintId: 's2', deliveryRatio: 1.0, estimationVariance: 0 }),
        createReliabilityRecord({ sprintId: 's3', deliveryRatio: 1.0, estimationVariance: 0 }),
      ]);

      const result = await service.computeCombinedScore(EVALUATION_ID);
      expect(result).not.toBeNull();
      expect(result!.planningReliabilityIncluded).toBe(true);
      expect(result!.confidenceFactor).toBe(1.0);
      expect(result!.effectiveWeights.quality).toBeCloseTo(0.8, 2);
      expect(result!.effectiveWeights.planning).toBeCloseTo(0.2, 2);

      // Perfect planning → score 100
      // Combined: 0.80 × 80 + 0.20 × 100 = 64 + 20 = 84
      expect(result!.combinedScore).toBe(84);
    });

    it('should reduce planning weight for sparse data (1 sprint)', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue({
        compositeScore: { toNumber: () => 80 },
        contributorId: CONTRIBUTOR_ID,
        status: 'COMPLETED',
      });
      mockPrisma.planningReliability.findMany.mockResolvedValue([
        createReliabilityRecord({ sprintId: 's1', deliveryRatio: 1.0, estimationVariance: 0 }),
      ]);

      const result = await service.computeCombinedScore(EVALUATION_ID);
      expect(result).not.toBeNull();
      expect(result!.planningReliabilityIncluded).toBe(true);
      expect(result!.confidenceFactor).toBeCloseTo(0.333, 2);
      // Effective planning weight: 0.20 × 0.333 ≈ 0.067
      expect(result!.effectiveWeights.planning).toBeCloseTo(0.067, 2);
      // Combined score should be closer to quality than full combined
      expect(result!.combinedScore).toBeGreaterThan(80); // planning score 100 pulls up
      expect(result!.combinedScore).toBeLessThan(84); // but less than full confidence
    });

    it('should use custom weights from config', async () => {
      mockZenhubConfigService.resolveQualityWeight.mockResolvedValue(0.7);
      mockZenhubConfigService.resolvePlanningWeight.mockResolvedValue(0.3);

      mockPrisma.evaluation.findUnique.mockResolvedValue({
        compositeScore: { toNumber: () => 60 },
        contributorId: CONTRIBUTOR_ID,
        status: 'COMPLETED',
      });
      mockPrisma.planningReliability.findMany.mockResolvedValue([
        createReliabilityRecord({ sprintId: 's1', deliveryRatio: 1.0, estimationVariance: 0 }),
        createReliabilityRecord({ sprintId: 's2', deliveryRatio: 1.0, estimationVariance: 0 }),
        createReliabilityRecord({ sprintId: 's3', deliveryRatio: 1.0, estimationVariance: 0 }),
      ]);

      const result = await service.computeCombinedScore(EVALUATION_ID);
      expect(result).not.toBeNull();
      expect(result!.weights.quality).toBe(0.7);
      expect(result!.weights.planning).toBe(0.3);
      // 0.70 × 60 + 0.30 × 100 = 42 + 30 = 72
      expect(result!.combinedScore).toBe(72);
    });
  });

  describe('getCombinedEvaluation', () => {
    it('should return combined data from metadata', async () => {
      const combinedData = {
        qualityScore: 80,
        planningReliabilityScore: 90,
        combinedScore: 82,
        weights: { quality: 0.8, planning: 0.2 },
        effectiveWeights: { quality: 0.8, planning: 0.2 },
        sprintCount: 3,
        confidenceFactor: 1.0,
        planningReliabilityIncluded: true,
      };

      mockPrisma.evaluation.findUnique.mockResolvedValue({
        metadata: { rawModelOutput: '{}', combinedEvaluation: combinedData },
      });

      const result = await service.getCombinedEvaluation(EVALUATION_ID);
      expect(result).toEqual(combinedData);
    });

    it('should return null when no combined data in metadata', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue({
        metadata: { rawModelOutput: '{}' },
      });

      const result = await service.getCombinedEvaluation(EVALUATION_ID);
      expect(result).toBeNull();
    });

    it('should return null when evaluation has no metadata', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue({ metadata: null });

      const result = await service.getCombinedEvaluation(EVALUATION_ID);
      expect(result).toBeNull();
    });
  });

  describe('handleEvaluationCompleted (event listener)', () => {
    const baseEvent: EvaluationCompletedEvent = {
      eventType: 'evaluation.score.completed',
      timestamp: new Date().toISOString(),
      correlationId: 'corr-1',
      actorId: CONTRIBUTOR_ID,
      payload: {
        evaluationId: EVALUATION_ID,
        contributionId: 'contrib-1',
        contributorId: CONTRIBUTOR_ID,
        contributionTitle: 'Test commit',
        contributionType: 'COMMIT',
        compositeScore: 80,
        domain: 'Technology',
      },
    };

    it('should skip when feature flag is disabled', async () => {
      mockZenhubConfigService.resolveCombinedScoreEnabled.mockResolvedValue(false);

      await service.handleEvaluationCompleted(baseEvent);

      expect(mockPrisma.evaluation.update).not.toHaveBeenCalled();
    });

    it('should skip gracefully when no planning data exists', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue({
        compositeScore: { toNumber: () => 80 },
        contributorId: CONTRIBUTOR_ID,
        status: 'COMPLETED',
      });
      mockPrisma.planningReliability.findMany.mockResolvedValue([]);

      await service.handleEvaluationCompleted(baseEvent);

      // Still stores result but with planningReliabilityIncluded: false
      expect(mockPrisma.evaluation.findUnique).toHaveBeenCalled();
    });

    it('should compute and store combined data in metadata when evaluation completes', async () => {
      // First call: computeCombinedScore checks the evaluation
      mockPrisma.evaluation.findUnique
        .mockResolvedValueOnce({
          compositeScore: { toNumber: () => 80 },
          contributorId: CONTRIBUTOR_ID,
          status: 'COMPLETED',
        })
        // Second call: fetch existing metadata for merge
        .mockResolvedValueOnce({
          metadata: { rawModelOutput: '{"some":"data"}' },
        });

      mockPrisma.planningReliability.findMany.mockResolvedValue([
        createReliabilityRecord({ sprintId: 's1', deliveryRatio: 0.9, estimationVariance: 10 }),
        createReliabilityRecord({ sprintId: 's2', deliveryRatio: 0.85, estimationVariance: 15 }),
        createReliabilityRecord({ sprintId: 's3', deliveryRatio: 0.95, estimationVariance: 5 }),
      ]);

      mockPrisma.evaluation.update.mockResolvedValue({});

      await service.handleEvaluationCompleted(baseEvent);

      expect(mockPrisma.evaluation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: EVALUATION_ID },
          data: {
            metadata: expect.objectContaining({
              rawModelOutput: '{"some":"data"}',
              combinedEvaluation: expect.objectContaining({
                qualityScore: 80,
                planningReliabilityIncluded: true,
                combinedScore: expect.any(Number),
                confidenceFactor: 1.0,
              }),
            }),
          },
        }),
      );
    });

    it('should not throw on errors — quality score remains unaffected', async () => {
      mockPrisma.evaluation.findUnique.mockRejectedValue(new Error('DB connection lost'));

      // Should not throw
      await expect(service.handleEvaluationCompleted(baseEvent)).resolves.not.toThrow();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EvaluationReviewService } from './evaluation-review.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { RedisService } from '../../../common/redis/redis.service.js';
import { AuditService } from '../../compliance/audit/audit.service.js';

const mockPrisma = {
  evaluation: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  evaluationReview: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  contributor: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn((fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)),
};

const mockRedis = {
  del: vi.fn().mockResolvedValue(1),
};

const mockEventEmitter = {
  emit: vi.fn(),
};

const mockAuditService = { log: vi.fn().mockResolvedValue(undefined) };

describe('EvaluationReviewService', () => {
  let service: EvaluationReviewService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        EvaluationReviewService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get(EvaluationReviewService);
  });

  describe('flagEvaluation', () => {
    const mockEvaluation = {
      id: 'eval-1',
      contributorId: 'contrib-1',
      contributionId: 'contribution-1',
      status: 'COMPLETED',
      compositeScore: { toNumber: () => 75 },
      dimensionScores: { complexity: { score: 80, explanation: 'Good' } },
      contribution: {
        id: 'contribution-1',
        title: 'Fix bug',
        contributionType: 'COMMIT',
        sourceRef: 'abc123',
      },
      review: null,
    };

    it('creates a review when evaluation is valid', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue(mockEvaluation);
      mockPrisma.evaluationReview.create.mockResolvedValue({
        id: 'review-1',
        evaluationId: 'eval-1',
        status: 'PENDING',
        flagReason:
          'The complexity score does not reflect the actual complexity of the changes made',
        flaggedAt: new Date(),
      });

      const result = await service.flagEvaluation(
        'eval-1',
        'contrib-1',
        'The complexity score does not reflect the actual complexity of the changes made',
        'corr-1',
      );

      expect(result.evaluationId).toBe('eval-1');
      expect(result.status).toBe('PENDING');
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'evaluation.review.flagged',
        expect.objectContaining({ eventType: 'evaluation.review.flagged' }),
      );
    });

    it('throws when evaluation not found', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue(null);

      await expect(
        service.flagEvaluation('eval-1', 'contrib-1', 'A'.repeat(50), 'corr-1'),
      ).rejects.toThrow('Evaluation not found');
    });

    it('throws when evaluation belongs to different contributor', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue({
        ...mockEvaluation,
        contributorId: 'other-contributor',
      });

      await expect(
        service.flagEvaluation('eval-1', 'contrib-1', 'A'.repeat(50), 'corr-1'),
      ).rejects.toThrow('You can only flag your own evaluations');
    });

    it('throws when evaluation is not completed', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue({
        ...mockEvaluation,
        status: 'PENDING',
      });

      await expect(
        service.flagEvaluation('eval-1', 'contrib-1', 'A'.repeat(50), 'corr-1'),
      ).rejects.toThrow('Only completed evaluations can be flagged for review');
    });

    it('throws when evaluation already flagged', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue({
        ...mockEvaluation,
        review: { id: 'existing-review' },
      });

      await expect(
        service.flagEvaluation('eval-1', 'contrib-1', 'A'.repeat(50), 'corr-1'),
      ).rejects.toThrow('This evaluation has already been flagged for review');
    });
  });

  describe('resolveReview', () => {
    const mockReview = {
      id: 'review-1',
      evaluationId: 'eval-1',
      contributorId: 'contrib-1',
      status: 'PENDING',
      evaluation: {
        id: 'eval-1',
        contributionId: 'contribution-1',
        contribution: { id: 'contribution-1', title: 'Fix bug' },
      },
    };

    it('confirms a review', async () => {
      mockPrisma.evaluationReview.findUnique.mockResolvedValue(mockReview);
      mockPrisma.evaluationReview.update.mockResolvedValue({
        id: 'review-1',
        status: 'CONFIRMED',
        reviewReason: 'AI assessment is accurate',
        resolvedAt: new Date(),
      });

      const result = await service.resolveReview(
        'review-1',
        'admin-1',
        'confirm',
        'AI assessment is accurate',
      );

      expect(result.status).toBe('CONFIRMED');
      expect(mockPrisma.evaluation.update).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'evaluation.review.resolved',
        expect.objectContaining({
          payload: expect.objectContaining({ action: 'confirm' }),
        }),
      );
    });

    it('overrides a review with new scores', async () => {
      mockPrisma.evaluationReview.findUnique.mockResolvedValue(mockReview);
      mockPrisma.evaluation.update.mockResolvedValue({});
      mockPrisma.evaluationReview.update.mockResolvedValue({
        id: 'review-1',
        status: 'OVERRIDDEN',
        reviewReason: 'Scores adjusted',
        resolvedAt: new Date(),
      });

      const overrideScores = {
        compositeScore: 90,
        dimensionScores: { complexity: { score: 95, explanation: 'Higher' } },
      };

      const result = await service.resolveReview(
        'review-1',
        'admin-1',
        'override',
        'Scores adjusted',
        overrideScores,
        'Updated narrative',
      );

      expect(result.status).toBe('OVERRIDDEN');
      expect(mockPrisma.evaluation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'eval-1' },
          data: expect.objectContaining({
            compositeScore: 90,
            narrative: 'Updated narrative',
          }),
        }),
      );
      expect(mockRedis.del).toHaveBeenCalledWith('evaluation:contribution-1');
    });

    it('throws when review not found', async () => {
      mockPrisma.evaluationReview.findUnique.mockResolvedValue(null);

      await expect(
        service.resolveReview('review-1', 'admin-1', 'confirm', 'Looks good'),
      ).rejects.toThrow('Evaluation review not found');
    });

    it('throws when review already resolved', async () => {
      mockPrisma.evaluationReview.findUnique.mockResolvedValue({
        ...mockReview,
        status: 'CONFIRMED',
      });

      await expect(
        service.resolveReview('review-1', 'admin-1', 'confirm', 'Looks good'),
      ).rejects.toThrow('This review has already been resolved');
    });
  });

  describe('getAgreementRates', () => {
    it('calculates agreement rates correctly', async () => {
      mockPrisma.evaluationReview.findMany.mockResolvedValue([
        {
          status: 'CONFIRMED',
          evaluation: {
            modelId: 'model-1',
            model: { version: 'v1.0' },
            contribution: { contributor: { domain: 'TECHNOLOGY' } },
          },
        },
        {
          status: 'CONFIRMED',
          evaluation: {
            modelId: 'model-1',
            model: { version: 'v1.0' },
            contribution: { contributor: { domain: 'TECHNOLOGY' } },
          },
        },
        {
          status: 'OVERRIDDEN',
          evaluation: {
            modelId: 'model-1',
            model: { version: 'v1.0' },
            contribution: { contributor: { domain: 'FINTECH' } },
          },
        },
      ]);

      const result = await service.getAgreementRates();

      expect(result.overall.totalReviewed).toBe(3);
      expect(result.overall.confirmed).toBe(2);
      expect(result.overall.overridden).toBe(1);
      expect(result.overall.agreementRate).toBe(67);
      expect(result.byModel).toHaveLength(1);
      expect(result.byModel[0].agreementRate).toBe(67);
      expect(result.byDomain).toHaveLength(2);
    });

    it('returns zero rates with no reviews', async () => {
      mockPrisma.evaluationReview.findMany.mockResolvedValue([]);

      const result = await service.getAgreementRates();

      expect(result.overall.totalReviewed).toBe(0);
      expect(result.overall.agreementRate).toBe(0);
    });
  });

  describe('getReviewQueue', () => {
    it('returns paginated review queue', async () => {
      mockPrisma.evaluationReview.findMany.mockResolvedValue([
        {
          id: 'review-1',
          evaluationId: 'eval-1',
          flagReason: 'Score seems low',
          flaggedAt: new Date(),
          status: 'PENDING',
          contributor: { name: 'John', domain: 'TECHNOLOGY' },
          evaluation: {
            compositeScore: { toNumber: () => 60 },
            contribution: { title: 'Fix tests' },
          },
        },
      ]);
      mockPrisma.evaluationReview.count.mockResolvedValue(1);

      const result = await service.getReviewQueue({ limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].contributorName).toBe('John');
      expect(result.items[0].originalScore).toBe(60);
      expect(result.pagination.total).toBe(1);
    });
  });
});

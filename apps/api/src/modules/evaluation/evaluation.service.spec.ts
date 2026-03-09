import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';
import { EvaluationService } from './evaluation.service.js';
import { EvaluationReviewService } from './services/evaluation-review.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

const mockPrisma = {
  evaluation: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  },
  contributor: {
    findUnique: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn((fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)),
};

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
};

const mockQueue = {
  add: vi.fn(),
};

const mockReviewService = {
  getAgreementRates: vi.fn().mockResolvedValue({
    overall: { totalReviewed: 0, confirmed: 0, overridden: 0, agreementRate: 0 },
    byModel: [],
    byDomain: [],
  }),
};

describe('EvaluationService', () => {
  let service: EvaluationService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              EVALUATION_ENABLED: 'true',
            }),
          ],
        }),
      ],
      providers: [
        EvaluationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: getQueueToken('evaluation-dispatch'), useValue: mockQueue },
        { provide: EvaluationReviewService, useValue: mockReviewService },
      ],
    }).compile();

    service = module.get(EvaluationService);
  });

  describe('handleContributionIngested (via handleCommitIngested)', () => {
    const payload = {
      contributionId: 'contrib-1',
      contributionType: 'COMMIT',
      contributorId: 'contributor-1',
      repositoryId: 'repo-1',
      correlationId: 'corr-1',
    };

    it('creates PENDING evaluation and enqueues job', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue(null);
      mockPrisma.evaluation.create.mockResolvedValue({
        id: 'eval-1',
        status: 'PENDING',
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.handleCommitIngested(payload);

      expect(mockPrisma.evaluation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contributionId: 'contrib-1',
          contributorId: 'contributor-1',
          status: 'PENDING',
        }),
      });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'dispatch-evaluation',
        expect.objectContaining({
          contributionId: 'contrib-1',
          contributionType: 'COMMIT',
          contributorId: 'contributor-1',
        }),
        expect.any(Object),
      );
    });

    it('skips non-code contributions', async () => {
      await service.handleCommitIngested({
        ...payload,
        contributionType: 'CODE_REVIEW',
      });

      expect(mockPrisma.evaluation.findUnique).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('is idempotent — skips if evaluation exists', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue({ id: 'existing-eval' });

      await service.handleCommitIngested(payload);

      expect(mockPrisma.evaluation.create).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('skips unattributed contributions', async () => {
      await service.handleCommitIngested({
        ...payload,
        contributorId: null,
      });

      expect(mockPrisma.evaluation.findUnique).not.toHaveBeenCalled();
    });

    it('skips dispatch when EVALUATION_ENABLED is false', async () => {
      const disabledModule = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            isGlobal: true,
            load: [
              () => ({
                EVALUATION_ENABLED: 'false',
              }),
            ],
          }),
        ],
        providers: [
          EvaluationService,
          { provide: PrismaService, useValue: mockPrisma },
          { provide: RedisService, useValue: mockRedis },
          { provide: getQueueToken('evaluation-dispatch'), useValue: mockQueue },
          { provide: EvaluationReviewService, useValue: mockReviewService },
        ],
      }).compile();

      const disabledService = disabledModule.get(EvaluationService);

      await disabledService.handleCommitIngested(payload);

      expect(mockPrisma.evaluation.findUnique).not.toHaveBeenCalled();
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('getEvaluation', () => {
    it('returns evaluation with contribution, model, provenance, and rubric', async () => {
      const evaluation = {
        id: 'eval-1',
        contributionId: 'contrib-1',
        contributorId: 'contributor-1',
        modelId: 'model-1',
        status: 'COMPLETED',
        compositeScore: { toNumber: () => 78.5 },
        dimensionScores: {},
        narrative: 'Good code',
        formulaVersion: 'v1.0.0',
        metadata: {
          formulaVersion: 'v1.0.0',
          weights: { complexity: 0.2, maintainability: 0.35 },
          taskComplexityMultiplier: 1.05,
          domainNormalizationFactor: 1.0,
          modelPromptVersion: 'code-v1',
        },
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        contribution: {
          id: 'contrib-1',
          title: 'Fix bug',
          contributionType: 'COMMIT',
          sourceRef: 'abc123',
        },
        model: { name: 'claude-sonnet', version: '4.0', provider: 'anthropic' },
        rubric: null,
      };
      mockPrisma.evaluation.findUnique.mockResolvedValue(evaluation);

      const result = await service.getEvaluation('eval-1');

      expect(result.id).toBe('eval-1');
      expect(result.compositeScore).toBe(78.5);
      expect(result.contribution.title).toBe('Fix bug');
      expect(result.model).toEqual({
        name: 'claude-sonnet',
        version: '4.0',
        provider: 'anthropic',
      });
      expect(result.provenance).toEqual({
        formulaVersion: 'v1.0.0',
        weights: { complexity: 0.2, maintainability: 0.35 },
        taskComplexityMultiplier: 1.05,
        domainNormalizationFactor: 1.0,
        modelPromptVersion: 'code-v1',
      });
      expect(result.rubric).toBeNull();
    });

    it('returns null model/provenance/rubric when not present', async () => {
      const evaluation = {
        id: 'eval-2',
        contributionId: 'contrib-2',
        contributorId: 'contributor-1',
        modelId: null,
        status: 'COMPLETED',
        compositeScore: { toNumber: () => 65 },
        dimensionScores: null,
        narrative: null,
        formulaVersion: null,
        metadata: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        contribution: {
          id: 'contrib-2',
          title: 'Test PR',
          contributionType: 'PULL_REQUEST',
          sourceRef: 'def456',
        },
        model: null,
        rubric: null,
      };
      mockPrisma.evaluation.findUnique.mockResolvedValue(evaluation);

      const result = await service.getEvaluation('eval-2');

      expect(result.model).toBeNull();
      expect(result.provenance).toBeNull();
      expect(result.rubric).toBeNull();
    });

    it('throws EVALUATION_NOT_FOUND', async () => {
      mockPrisma.evaluation.findUnique.mockResolvedValue(null);

      await expect(service.getEvaluation('nonexistent')).rejects.toThrow(DomainException);
    });
  });

  describe('getEvaluationByContribution', () => {
    it('checks Redis cache first', async () => {
      mockRedis.get.mockResolvedValue({
        evaluationId: 'eval-1',
        status: 'COMPLETED',
        compositeScore: 80,
      });
      mockPrisma.evaluation.findUnique.mockResolvedValue({
        id: 'eval-1',
        contributionId: 'contrib-1',
        contributorId: 'contributor-1',
        modelId: null,
        status: 'COMPLETED',
        compositeScore: { toNumber: () => 80 },
        dimensionScores: null,
        narrative: null,
        formulaVersion: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        contribution: {
          id: 'contrib-1',
          title: 'test',
          contributionType: 'COMMIT',
          sourceRef: 'abc',
        },
      });

      const result = await service.getEvaluationByContribution('contrib-1');

      expect(mockRedis.get).toHaveBeenCalledWith('evaluation:contrib-1');
      expect(result).not.toBeNull();
    });

    it('falls back to DB when cache miss', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.evaluation.findUnique.mockResolvedValue({
        id: 'eval-1',
        contributionId: 'contrib-1',
        contributorId: 'contributor-1',
        modelId: null,
        status: 'COMPLETED',
        compositeScore: { toNumber: () => 80 },
        dimensionScores: null,
        narrative: null,
        formulaVersion: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        contribution: {
          id: 'contrib-1',
          title: 'test',
          contributionType: 'COMMIT',
          sourceRef: 'abc',
        },
      });

      const result = await service.getEvaluationByContribution('contrib-1');

      expect(result).not.toBeNull();
    });
  });

  describe('getEvaluationsForContributor', () => {
    it('paginates correctly', async () => {
      const items = Array.from({ length: 21 }, (_, i) => ({
        id: `eval-${i}`,
        contributionId: `contrib-${i}`,
        contributorId: 'contributor-1',
        modelId: null,
        status: 'COMPLETED',
        compositeScore: { toNumber: () => 70 + i },
        dimensionScores: null,
        narrative: null,
        formulaVersion: null,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        contribution: {
          id: `contrib-${i}`,
          title: `Contribution ${i}`,
          contributionType: 'COMMIT',
          sourceRef: `ref-${i}`,
        },
      }));

      mockPrisma.evaluation.findMany.mockResolvedValue(items);
      mockPrisma.evaluation.count.mockResolvedValue(25);

      const result = await service.getEvaluationsForContributor('contributor-1', { limit: 20 });

      expect(result.items).toHaveLength(20);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.cursor).not.toBeNull();
    });

    it('applies contributionType filter', async () => {
      mockPrisma.evaluation.findMany.mockResolvedValue([]);
      mockPrisma.evaluation.count.mockResolvedValue(0);

      await service.getEvaluationsForContributor('contributor-1', {
        limit: 20,
        contributionType: 'DOCUMENTATION',
      });

      expect(mockPrisma.evaluation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contribution: { contributionType: 'DOCUMENTATION' },
          }),
        }),
      );
    });

    it('applies date range filters', async () => {
      mockPrisma.evaluation.findMany.mockResolvedValue([]);
      mockPrisma.evaluation.count.mockResolvedValue(0);

      await service.getEvaluationsForContributor('contributor-1', {
        limit: 20,
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-03-01T00:00:00.000Z',
      });

      expect(mockPrisma.evaluation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            completedAt: {
              gte: new Date('2026-01-01T00:00:00.000Z'),
              lte: new Date('2026-03-01T00:00:00.000Z'),
            },
          }),
        }),
      );
    });
  });

  describe('getPublicEvaluationAggregate', () => {
    it('returns cached aggregate when Redis hit', async () => {
      const cachedAggregate = {
        totalEvaluations: 100,
        averageScore: 75.5,
        byDomain: [{ domain: 'Technology', averageScore: 78.0, count: 50 }],
        scoreDistribution: [
          { range: '0–20', min: 0, max: 20, count: 5 },
          { range: '21–40', min: 21, max: 40, count: 10 },
          { range: '41–60', min: 41, max: 60, count: 20 },
          { range: '61–80', min: 61, max: 80, count: 40 },
          { range: '81–100', min: 81, max: 100, count: 25 },
        ],
        agreementRate: { overall: 0.95, totalReviewed: 20 },
      };
      mockRedis.get.mockResolvedValue(cachedAggregate);

      const result = await service.getPublicEvaluationAggregate();

      expect(result).toEqual(cachedAggregate);
      expect(mockPrisma.evaluation.findMany).not.toHaveBeenCalled();
    });

    it('computes histogram buckets correctly and caches on miss', async () => {
      mockRedis.get.mockResolvedValue(null);

      const evaluations = [
        { compositeScore: { toNumber: () => 15 }, contributor: { domain: 'Technology' } },
        { compositeScore: { toNumber: () => 35 }, contributor: { domain: 'Technology' } },
        { compositeScore: { toNumber: () => 55 }, contributor: { domain: 'Fintech' } },
        { compositeScore: { toNumber: () => 75 }, contributor: { domain: 'Fintech' } },
        { compositeScore: { toNumber: () => 95 }, contributor: { domain: 'Technology' } },
      ];
      mockPrisma.evaluation.findMany.mockResolvedValue(evaluations);

      const result = await service.getPublicEvaluationAggregate();

      expect(result.totalEvaluations).toBe(5);
      expect(result.averageScore).toBe(55);
      expect(result.scoreDistribution[0].count).toBe(1); // 0-20
      expect(result.scoreDistribution[1].count).toBe(1); // 21-40
      expect(result.scoreDistribution[2].count).toBe(1); // 41-60
      expect(result.scoreDistribution[3].count).toBe(1); // 61-80
      expect(result.scoreDistribution[4].count).toBe(1); // 81-100
      expect(result.byDomain).toHaveLength(2);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'public:evaluation-aggregate',
        expect.any(Object),
        300,
      );
    });

    it('returns zero average when no evaluations exist', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.evaluation.findMany.mockResolvedValue([]);

      const result = await service.getPublicEvaluationAggregate();

      expect(result.totalEvaluations).toBe(0);
      expect(result.averageScore).toBe(0);
      expect(result.byDomain).toHaveLength(0);
    });
  });

  describe('getContributorPublicScores', () => {
    it('returns null when contributor does not exist', async () => {
      mockPrisma.contributor.findUnique.mockResolvedValue(null);

      const result = await service.getContributorPublicScores('nonexistent');

      expect(result).toBeNull();
    });

    it('returns null when showEvaluationScores is false', async () => {
      mockPrisma.contributor.findUnique.mockResolvedValue({
        id: 'contributor-1',
        showEvaluationScores: false,
      });

      const result = await service.getContributorPublicScores('contributor-1');

      expect(result).toBeNull();
      expect(mockPrisma.evaluation.findMany).not.toHaveBeenCalled();
    });

    it('returns null when evaluations array is empty', async () => {
      mockPrisma.contributor.findUnique.mockResolvedValue({
        id: 'contributor-1',
        showEvaluationScores: true,
      });
      mockPrisma.evaluation.findMany.mockResolvedValue([]);

      const result = await service.getContributorPublicScores('contributor-1');

      expect(result).toBeNull();
    });

    it('returns narrative and recentScores when consented', async () => {
      mockPrisma.contributor.findUnique.mockResolvedValue({
        id: 'contributor-1',
        showEvaluationScores: true,
      });
      mockPrisma.evaluation.findMany.mockResolvedValue([
        {
          compositeScore: { toNumber: () => 80 },
          completedAt: new Date('2026-03-01T12:00:00.000Z'),
          contribution: { contributionType: 'COMMIT' },
        },
        {
          compositeScore: { toNumber: () => 70 },
          completedAt: new Date('2026-02-28T12:00:00.000Z'),
          contribution: { contributionType: 'PULL_REQUEST' },
        },
      ]);
      mockPrisma.evaluation.aggregate.mockResolvedValue({
        _avg: { compositeScore: { toNumber: () => 75 } },
      });
      mockPrisma.evaluation.count.mockResolvedValue(10);

      const result = await service.getContributorPublicScores('contributor-1');

      expect(result).not.toBeNull();
      expect(result!.contributorId).toBe('contributor-1');
      expect(result!.averageScore).toBe(75);
      expect(result!.evaluationCount).toBe(10);
      expect(result!.narrative).toContain('10 times');
      expect(result!.narrative).toContain('75');
      expect(result!.recentScores).toHaveLength(2);
      expect(result!.recentScores[0].score).toBe(80);
      expect(result!.recentScores[0].contributionType).toBe('COMMIT');
    });
  });

  describe('getEvaluationHistory', () => {
    it('returns completed evaluations with narrative preview', async () => {
      const completedAt = new Date('2026-03-01T12:00:00.000Z');
      mockPrisma.evaluation.findMany.mockResolvedValue([
        {
          id: 'eval-1',
          compositeScore: { toNumber: () => 82 },
          narrative: 'Your refactoring improved code clarity. The approach was systematic.',
          completedAt,
          contribution: {
            contributionType: 'COMMIT',
            title: 'Refactor auth module',
          },
        },
      ]);
      mockPrisma.evaluation.count.mockResolvedValue(1);

      const result = await service.getEvaluationHistory('contributor-1', { limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].compositeScore).toBe(82);
      expect(result.items[0].narrativePreview).toBe('Your refactoring improved code clarity.');
      expect(result.items[0].contributionType).toBe('COMMIT');
      expect(result.items[0].contributionTitle).toBe('Refactor auth module');
    });

    it('filters by contributionType', async () => {
      mockPrisma.evaluation.findMany.mockResolvedValue([]);
      mockPrisma.evaluation.count.mockResolvedValue(0);

      await service.getEvaluationHistory('contributor-1', {
        limit: 20,
        contributionType: 'DOCUMENTATION',
      });

      expect(mockPrisma.evaluation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'COMPLETED',
            contribution: { contributionType: 'DOCUMENTATION' },
          }),
        }),
      );
    });

    it('handles null narrative gracefully', async () => {
      mockPrisma.evaluation.findMany.mockResolvedValue([
        {
          id: 'eval-2',
          compositeScore: { toNumber: () => 70 },
          narrative: null,
          completedAt: new Date(),
          contribution: { contributionType: 'COMMIT', title: 'Fix bug' },
        },
      ]);
      mockPrisma.evaluation.count.mockResolvedValue(1);

      const result = await service.getEvaluationHistory('contributor-1', { limit: 20 });

      expect(result.items[0].narrativePreview).toBe('');
    });

    it('paginates with cursor', async () => {
      const items = Array.from({ length: 21 }, (_, i) => ({
        id: `eval-${i}`,
        compositeScore: { toNumber: () => 70 + i },
        narrative: `Evaluation ${i}.`,
        completedAt: new Date(`2026-03-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`),
        contribution: { contributionType: 'COMMIT', title: `Contribution ${i}` },
      }));
      mockPrisma.evaluation.findMany.mockResolvedValue(items);
      mockPrisma.evaluation.count.mockResolvedValue(30);

      const result = await service.getEvaluationHistory('contributor-1', { limit: 20 });

      expect(result.items).toHaveLength(20);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.cursor).not.toBeNull();
    });
  });
});

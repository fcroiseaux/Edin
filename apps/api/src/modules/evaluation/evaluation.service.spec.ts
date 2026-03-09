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

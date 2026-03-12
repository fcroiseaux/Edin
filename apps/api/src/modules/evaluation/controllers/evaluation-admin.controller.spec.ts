import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { EvaluationAdminController } from './evaluation-admin.controller.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { EvaluationRubricService } from '../services/evaluation-rubric.service.js';
import { EvaluationReviewService } from '../services/evaluation-review.service.js';
import { EVALUATION_PROVIDER } from '../providers/evaluation-provider.interface.js';
import { CaslAbilityFactory } from '../../auth/casl/ability.factory.js';
import { AuditService } from '../../compliance/audit/audit.service.js';
import type { CurrentUserPayload } from '../../../common/decorators/current-user.decorator.js';

const adminUser: CurrentUserPayload = {
  id: 'admin-1',
  githubId: 12345,
  role: 'ADMIN',
  email: 'admin@test.com',
} as CurrentUserPayload;

const mockPrisma = {
  evaluationModel: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  evaluation: {
    groupBy: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn((fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)),
};

const mockRubricService = {
  listRubrics: vi.fn(),
  createRubricVersion: vi.fn(),
};

const mockAuditService = { log: vi.fn().mockResolvedValue(undefined) };

const mockReviewService = {
  getReviewQueue: vi.fn(),
  getReviewDetail: vi.fn(),
  resolveReview: vi.fn(),
  getAgreementRates: vi.fn(),
};

const mockEvaluationProvider = {
  evaluateCode: vi.fn(),
  evaluateDocumentation: vi.fn(),
  listAvailableModels: vi.fn(),
};

describe('EvaluationAdminController', () => {
  let controller: EvaluationAdminController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [EvaluationAdminController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EvaluationRubricService, useValue: mockRubricService },
        { provide: EvaluationReviewService, useValue: mockReviewService },
        { provide: CaslAbilityFactory, useValue: {} },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EVALUATION_PROVIDER, useValue: mockEvaluationProvider },
      ],
    }).compile();

    controller = module.get(EvaluationAdminController);
  });

  describe('listModels', () => {
    it('returns all models with evaluation counts', async () => {
      mockPrisma.evaluationModel.findMany.mockResolvedValue([
        {
          id: 'model-1',
          name: 'code-evaluator',
          version: 'v1.0.0',
          provider: 'anthropic',
          apiModelId: 'claude-sonnet-4-5-20250514',
          evaluationType: 'CODE',
          status: 'ACTIVE',
          configHash: 'abc',
          deployedAt: new Date('2026-03-01'),
          retiredAt: null,
          createdAt: new Date('2026-03-01'),
        },
      ]);
      mockPrisma.evaluation.groupBy.mockResolvedValue([{ modelId: 'model-1', _count: { id: 42 } }]);

      const result = await controller.listModels(adminUser);

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toEqual(
        expect.objectContaining({
          id: 'model-1',
          name: 'code-evaluator',
          evaluationCount: 42,
          status: 'ACTIVE',
        }),
      );
    });
  });

  describe('getModelMetrics', () => {
    it('returns metrics for a model', async () => {
      mockPrisma.evaluationModel.findUnique.mockResolvedValue({
        id: 'model-1',
        name: 'code-evaluator',
        version: 'v1.0.0',
      });
      mockPrisma.evaluation.findMany.mockResolvedValue([
        { compositeScore: { toNumber: () => 80 } },
        { compositeScore: { toNumber: () => 90 } },
        { compositeScore: { toNumber: () => 70 } },
      ]);

      mockReviewService.getAgreementRates.mockResolvedValue({
        overall: { totalReviewed: 0, confirmed: 0, overridden: 0, agreementRate: 0 },
        byModel: [],
        byDomain: [],
      });

      const result = await controller.getModelMetrics('model-1');

      expect(result.data.evaluationCount).toBe(3);
      expect(result.data.averageScore).toBe(80);
    });

    it('throws NOT_FOUND for unknown model', async () => {
      mockPrisma.evaluationModel.findUnique.mockResolvedValue(null);

      await expect(controller.getModelMetrics('unknown')).rejects.toThrow();
    });
  });

  describe('registerModel', () => {
    it('creates a new model version with apiModelId', async () => {
      const created = {
        id: 'model-new',
        name: 'Claude Sonnet 4.5',
        version: 'v1.0.0',
        provider: 'anthropic',
        apiModelId: 'claude-sonnet-4-5-20250514',
        evaluationType: 'CODE',
        status: 'ACTIVE',
        configHash: null,
        config: null,
        deployedAt: new Date(),
        retiredAt: null,
        createdAt: new Date(),
      };
      mockPrisma.evaluationModel.create.mockResolvedValue(created);

      const result = await controller.registerModel(
        {
          apiModelId: 'claude-sonnet-4-5-20250514',
          evaluationType: 'CODE',
          version: 'v1.0.0',
          name: 'Claude Sonnet 4.5',
        },
        adminUser,
      );

      expect(result.data.apiModelId).toBe('claude-sonnet-4-5-20250514');
      expect(result.data.evaluationType).toBe('CODE');
    });

    it('rejects missing required fields', async () => {
      await expect(
        controller.registerModel({ apiModelId: '', evaluationType: '', version: '' }, adminUser),
      ).rejects.toThrow();
    });

    it('rejects invalid evaluation type', async () => {
      await expect(
        controller.registerModel(
          { apiModelId: 'claude-sonnet-4-5-20250514', evaluationType: 'INVALID', version: 'v1' },
          adminUser,
        ),
      ).rejects.toThrow('evaluationType must be one of');
    });
  });

  describe('listAvailableModels', () => {
    it('returns available models from provider', async () => {
      mockEvaluationProvider.listAvailableModels.mockResolvedValue([
        {
          id: 'claude-sonnet-4-5-20250514',
          displayName: 'Claude Sonnet 4.5',
          createdAt: '2025-05-14T00:00:00Z',
        },
      ]);

      const result = await controller.listAvailableModels();

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('claude-sonnet-4-5-20250514');
    });
  });

  describe('listRubrics', () => {
    it('delegates to rubric service', async () => {
      mockRubricService.listRubrics.mockResolvedValue([]);

      const result = await controller.listRubrics('DOCUMENTATION');

      expect(mockRubricService.listRubrics).toHaveBeenCalledWith('DOCUMENTATION');
      expect(result.data).toEqual([]);
    });
  });

  describe('createRubric', () => {
    it('creates a new rubric version', async () => {
      const rubric = {
        id: 'rubric-1',
        evaluationType: 'DOCUMENTATION',
        version: 'v1.0.0',
        parameters: {},
      };
      mockRubricService.createRubricVersion.mockResolvedValue(rubric);

      const result = await controller.createRubric(
        {
          evaluationType: 'DOCUMENTATION',
          parameters: { requiredSections: ['Intro'] },
          version: 'v1.0.0',
        },
        adminUser,
      );

      expect(result.data.evaluationType).toBe('DOCUMENTATION');
    });
  });
});

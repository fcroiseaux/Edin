import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { EvaluationAdminController } from './evaluation-admin.controller.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { EvaluationRubricService } from '../services/evaluation-rubric.service.js';
import { CaslAbilityFactory } from '../../auth/casl/ability.factory.js';
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
  auditLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn((fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)),
};

const mockRubricService = {
  listRubrics: vi.fn(),
  createRubricVersion: vi.fn(),
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
        { provide: CaslAbilityFactory, useValue: {} },
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

      const result = await controller.getModelMetrics('model-1', adminUser);

      expect(result.data.evaluationCount).toBe(3);
      expect(result.data.averageScore).toBe(80);
    });

    it('throws NOT_FOUND for unknown model', async () => {
      mockPrisma.evaluationModel.findUnique.mockResolvedValue(null);

      await expect(controller.getModelMetrics('unknown', adminUser)).rejects.toThrow();
    });
  });

  describe('registerModel', () => {
    it('creates a new model version', async () => {
      const created = {
        id: 'model-new',
        name: 'doc-evaluator',
        version: 'v1.0.0',
        provider: 'anthropic',
        status: 'ACTIVE',
        configHash: null,
        config: null,
        deployedAt: new Date(),
        retiredAt: null,
        createdAt: new Date(),
      };
      mockPrisma.evaluationModel.create.mockResolvedValue(created);
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await controller.registerModel(
        { name: 'doc-evaluator', version: 'v1.0.0', provider: 'anthropic' },
        adminUser,
      );

      expect(result.data.name).toBe('doc-evaluator');
    });

    it('rejects missing required fields', async () => {
      await expect(
        controller.registerModel({ name: '', version: '', provider: '' }, adminUser),
      ).rejects.toThrow();
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
      mockPrisma.auditLog.create.mockResolvedValue({});

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

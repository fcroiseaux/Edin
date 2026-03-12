import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { EvaluationModelRegistry } from './evaluation-model.registry.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { DomainException } from '../../../common/exceptions/domain.exception.js';

const mockPrisma = {
  evaluationModel: {
    findFirst: vi.fn(),
  },
};

describe('EvaluationModelRegistry', () => {
  let registry: EvaluationModelRegistry;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [EvaluationModelRegistry, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    registry = module.get(EvaluationModelRegistry);
  });

  describe('getActiveModel', () => {
    it('returns active model for code type', async () => {
      const model = {
        id: 'model-1',
        name: 'code-evaluator',
        version: 'v1.0.0',
        provider: 'anthropic',
        apiModelId: 'claude-sonnet-4-5-20250514',
        evaluationType: 'CODE',
        status: 'ACTIVE',
        config: { modelId: 'claude-sonnet-4-5-20250514' },
        createdAt: new Date(),
      };
      mockPrisma.evaluationModel.findFirst.mockResolvedValue(model);

      const result = await registry.getActiveModel('code');

      expect(result).toEqual(model);
      expect(result.apiModelId).toBe('claude-sonnet-4-5-20250514');
      expect(mockPrisma.evaluationModel.findFirst).toHaveBeenCalledWith({
        where: {
          evaluationType: 'CODE',
          status: 'ACTIVE',
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('returns active model for documentation type', async () => {
      const model = {
        id: 'model-2',
        name: 'doc-evaluator',
        version: 'v1.0.0',
        provider: 'anthropic',
        apiModelId: 'claude-sonnet-4-5-20250514',
        evaluationType: 'DOCUMENTATION',
        status: 'ACTIVE',
        createdAt: new Date(),
      };
      mockPrisma.evaluationModel.findFirst.mockResolvedValue(model);

      const result = await registry.getActiveModel('documentation');

      expect(result).toEqual(model);
      expect(mockPrisma.evaluationModel.findFirst).toHaveBeenCalledWith({
        where: {
          evaluationType: 'DOCUMENTATION',
          status: 'ACTIVE',
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('throws EVALUATION_MODEL_UNAVAILABLE when no active model', async () => {
      mockPrisma.evaluationModel.findFirst.mockResolvedValue(null);

      await expect(registry.getActiveModel('code')).rejects.toThrow(DomainException);
      await expect(registry.getActiveModel('code')).rejects.toThrow(
        'No active evaluation model available for type: code',
      );
    });
  });
});

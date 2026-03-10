import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { EvaluationRubricService } from './evaluation-rubric.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { AuditService } from '../../compliance/audit/audit.service.js';

const mockPrisma = {
  evaluationRubric: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
  $transaction: vi.fn((fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)),
};

const mockAuditService = { log: vi.fn().mockResolvedValue(undefined) };

describe('EvaluationRubricService', () => {
  let service: EvaluationRubricService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        EvaluationRubricService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get(EvaluationRubricService);
  });

  describe('getActiveRubric', () => {
    it('returns active rubric for evaluation type', async () => {
      const mockRubric = {
        id: 'rubric-1',
        evaluationType: 'DOCUMENTATION',
        documentType: null,
        parameters: { targetFleschKincaidRange: { min: 30, max: 60 } },
        version: 'v1.0.0',
        isActive: true,
        createdAt: new Date('2026-03-01'),
      };

      mockPrisma.evaluationRubric.findFirst.mockResolvedValue(mockRubric);

      const result = await service.getActiveRubric('DOCUMENTATION');

      expect(mockPrisma.evaluationRubric.findFirst).toHaveBeenCalledWith({
        where: {
          evaluationType: 'DOCUMENTATION',
          isActive: true,
          documentType: null,
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: 'rubric-1',
          evaluationType: 'DOCUMENTATION',
          version: 'v1.0.0',
          isActive: true,
        }),
      );
    });

    it('filters by documentType when provided', async () => {
      mockPrisma.evaluationRubric.findFirst.mockResolvedValue(null);

      await service.getActiveRubric('DOCUMENTATION', 'README');

      expect(mockPrisma.evaluationRubric.findFirst).toHaveBeenCalledWith({
        where: {
          evaluationType: 'DOCUMENTATION',
          isActive: true,
          documentType: 'README',
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('returns null when no active rubric exists', async () => {
      mockPrisma.evaluationRubric.findFirst.mockResolvedValue(null);

      const result = await service.getActiveRubric('DOCUMENTATION');

      expect(result).toBeNull();
    });
  });

  describe('listRubrics', () => {
    it('lists all rubrics for a given type', async () => {
      mockPrisma.evaluationRubric.findMany.mockResolvedValue([
        {
          id: 'rubric-1',
          evaluationType: 'DOCUMENTATION',
          documentType: null,
          parameters: {},
          version: 'v1.0.0',
          isActive: false,
          createdAt: new Date('2026-03-01'),
        },
        {
          id: 'rubric-2',
          evaluationType: 'DOCUMENTATION',
          documentType: null,
          parameters: {},
          version: 'v1.1.0',
          isActive: true,
          createdAt: new Date('2026-03-05'),
        },
      ]);

      const result = await service.listRubrics('DOCUMENTATION');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('rubric-1');
    });
  });

  describe('createRubricVersion', () => {
    it('deactivates previous rubrics and creates new version', async () => {
      mockPrisma.evaluationRubric.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.evaluationRubric.create.mockResolvedValue({
        id: 'rubric-new',
        evaluationType: 'DOCUMENTATION',
        documentType: null,
        parameters: { requiredSections: ['Intro'] },
        version: 'v2.0.0',
        isActive: true,
        createdAt: new Date('2026-03-09'),
      });

      const result = await service.createRubricVersion({
        evaluationType: 'DOCUMENTATION',
        parameters: { requiredSections: ['Intro'] },
        version: 'v2.0.0',
      });

      expect(mockPrisma.evaluationRubric.updateMany).toHaveBeenCalledWith({
        where: {
          evaluationType: 'DOCUMENTATION',
          documentType: null,
          isActive: true,
        },
        data: { isActive: false },
      });

      expect(result.id).toBe('rubric-new');
      expect(result.version).toBe('v2.0.0');
      expect(result.isActive).toBe(true);
    });

    it('creates audit log when audit context is provided', async () => {
      mockPrisma.evaluationRubric.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.evaluationRubric.create.mockResolvedValue({
        id: 'rubric-audit',
        evaluationType: 'DOCUMENTATION',
        documentType: null,
        parameters: {},
        version: 'v1.0.0',
        isActive: true,
        createdAt: new Date('2026-03-09'),
      });
      await service.createRubricVersion(
        {
          evaluationType: 'DOCUMENTATION',
          parameters: {},
          version: 'v1.0.0',
        },
        { actorId: 'admin-1', correlationId: 'corr-1' },
      );

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-1',
          action: 'EVALUATION_RUBRIC_CREATED',
          entityType: 'EvaluationRubric',
          entityId: 'rubric-audit',
          correlationId: 'corr-1',
        }),
        expect.anything(),
      );
    });
  });
});

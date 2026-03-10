import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { EuAiActService } from './eu-ai-act.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { DomainException } from '../../../common/exceptions/domain.exception.js';

const mockPrisma = {
  evaluationModel: {
    findMany: vi.fn(),
  },
  evaluationRubric: {
    findMany: vi.fn(),
  },
  scoringFormulaVersion: {
    findFirst: vi.fn(),
  },
  evaluationReview: {
    groupBy: vi.fn(),
    findMany: vi.fn(),
  },
  complianceDocument: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
};

const mockAuditService = { log: vi.fn().mockResolvedValue(undefined) };

describe('EuAiActService', () => {
  let service: EuAiActService;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default: no previous document version
    mockPrisma.complianceDocument.findFirst.mockResolvedValue(null);
    mockPrisma.complianceDocument.create.mockImplementation(({ data }) => {
      return Promise.resolve({
        ...data,
        generatedAt: new Date(),
        legalReviewedAt: null,
        legalReviewedBy: null,
        reviewNotes: null,
        retiredAt: null,
      });
    });

    const module = await Test.createTestingModule({
      providers: [
        EuAiActService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get(EuAiActService);
  });

  it('generates MODEL_CARD document', async () => {
    mockPrisma.evaluationModel.findMany.mockResolvedValue([
      {
        id: 'model-1',
        name: 'code-evaluator',
        version: 'v1.0.0',
        provider: 'anthropic',
        status: 'ACTIVE',
        configHash: 'abc',
        deployedAt: new Date('2026-01-01'),
        retiredAt: null,
        createdAt: new Date('2026-01-01'),
      },
    ]);

    const result = await service.generateDocument('MODEL_CARD', 'corr-1');

    expect(result.documentType).toBe('MODEL_CARD');
    expect(result.version).toBe(1);
    expect(result.content).toEqual(
      expect.objectContaining({
        documentType: 'MODEL_CARD',
        models: expect.arrayContaining([
          expect.objectContaining({ id: 'model-1', name: 'code-evaluator' }),
        ]),
      }),
    );
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'compliance.document.generated' }),
    );
  });

  it('generates EVALUATION_CRITERIA document', async () => {
    mockPrisma.evaluationRubric.findMany.mockResolvedValue([
      {
        id: 'rubric-1',
        evaluationType: 'CODE',
        documentType: null,
        version: 'v1.0.0',
        isActive: true,
        parameters: { dimensions: ['complexity'] },
        createdAt: new Date('2026-01-01'),
      },
    ]);
    mockPrisma.scoringFormulaVersion.findFirst.mockResolvedValue({
      id: 'formula-1',
      version: 1,
      aiEvalWeight: 0.4,
      peerFeedbackWeight: 0.25,
      complexityWeight: 0.2,
      domainNormWeight: 0.15,
      effectiveFrom: new Date('2026-01-01'),
      effectiveTo: null,
    });

    const result = await service.generateDocument('EVALUATION_CRITERIA', 'corr-2');

    expect(result.content).toEqual(
      expect.objectContaining({
        documentType: 'EVALUATION_CRITERIA',
        rubrics: expect.arrayContaining([
          expect.objectContaining({ id: 'rubric-1', evaluationType: 'CODE' }),
        ]),
        scoringFormula: expect.objectContaining({
          aiEvalWeight: 0.4,
        }),
      }),
    );
  });

  it('generates HUMAN_OVERSIGHT_REPORT document', async () => {
    mockPrisma.evaluationReview.groupBy.mockResolvedValue([
      { status: 'PENDING', _count: { id: 5 } },
      { status: 'CONFIRMED', _count: { id: 10 } },
      { status: 'OVERRIDDEN', _count: { id: 3 } },
    ]);

    const flaggedAt = new Date('2026-03-01T10:00:00Z');
    const resolvedAt = new Date('2026-03-01T14:00:00Z');
    mockPrisma.evaluationReview.findMany.mockResolvedValue([{ flaggedAt, resolvedAt }]);

    const result = await service.generateDocument('HUMAN_OVERSIGHT_REPORT', 'corr-3');

    expect(result.content).toEqual(
      expect.objectContaining({
        documentType: 'HUMAN_OVERSIGHT_REPORT',
        reviewCountByStatus: expect.arrayContaining([
          expect.objectContaining({ status: 'PENDING', count: 5 }),
        ]),
        totalReviewed: 1,
        averageResolutionTimeHours: 4,
      }),
    );
  });

  it('generates DATA_PROCESSING_RECORD document', async () => {
    const result = await service.generateDocument('DATA_PROCESSING_RECORD', 'corr-4');

    expect(result.content).toEqual(
      expect.objectContaining({
        documentType: 'DATA_PROCESSING_RECORD',
        dataController: 'Edin Platform',
        processingActivities: expect.any(Array),
        dataSubjectRights: expect.any(Array),
      }),
    );
  });

  it('versions documents correctly (increments)', async () => {
    mockPrisma.evaluationModel.findMany.mockResolvedValue([]);

    // First document — no previous version
    mockPrisma.complianceDocument.findFirst.mockResolvedValue(null);
    await service.generateDocument('MODEL_CARD', 'corr-5');

    expect(mockPrisma.complianceDocument.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ version: 1 }),
    });

    // Second document — previous version exists
    mockPrisma.complianceDocument.findFirst.mockResolvedValue({ version: 3 });
    await service.generateDocument('MODEL_CARD', 'corr-6');

    expect(mockPrisma.complianceDocument.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ version: 4 }),
    });
  });

  it('lists documents with pagination', async () => {
    const docs = Array.from({ length: 3 }, (_, i) => ({
      id: `doc-${i}`,
      documentType: 'MODEL_CARD',
      version: i + 1,
      content: '{}',
      format: 'json',
      generatedAt: new Date(),
      legalReviewedAt: null,
      legalReviewedBy: null,
      reviewNotes: null,
      retiredAt: null,
      correlationId: null,
    }));

    mockPrisma.complianceDocument.findMany.mockResolvedValue(docs);

    const result = await service.listDocuments(undefined, 20);

    expect(result.items).toHaveLength(3);
    expect(result.nextCursor).toBeNull();
  });

  it('returns document detail with parsed content', async () => {
    const content = { documentType: 'MODEL_CARD', models: [] };
    mockPrisma.complianceDocument.findUnique.mockResolvedValue({
      id: 'doc-1',
      documentType: 'MODEL_CARD',
      version: 1,
      content: JSON.stringify(content),
      format: 'json',
      generatedAt: new Date(),
      legalReviewedAt: null,
      legalReviewedBy: null,
      reviewNotes: null,
      retiredAt: null,
      correlationId: 'corr-1',
    });

    const result = await service.getDocument('doc-1');

    expect(result.id).toBe('doc-1');
    expect(result.content).toEqual(content);
  });

  it('reviews document (sets legal review fields)', async () => {
    const doc = {
      id: 'doc-1',
      documentType: 'MODEL_CARD',
      version: 1,
      content: '{}',
      format: 'json',
      generatedAt: new Date(),
      legalReviewedAt: null,
      legalReviewedBy: null,
      reviewNotes: null,
      retiredAt: null,
      correlationId: 'corr-1',
    };

    mockPrisma.complianceDocument.findUnique.mockResolvedValue(doc);
    mockPrisma.complianceDocument.update.mockResolvedValue({
      ...doc,
      legalReviewedAt: new Date(),
      legalReviewedBy: 'reviewer-1',
      reviewNotes: 'Looks compliant',
    });

    const result = await service.reviewDocument('doc-1', 'reviewer-1', 'Looks compliant', 'corr-7');

    expect(mockPrisma.complianceDocument.update).toHaveBeenCalledWith({
      where: { id: 'doc-1' },
      data: expect.objectContaining({
        legalReviewedBy: 'reviewer-1',
        reviewNotes: 'Looks compliant',
      }),
    });
    expect(result.legalReviewedBy).toBe('reviewer-1');
    expect(result.reviewNotes).toBe('Looks compliant');
    expect(mockAuditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'compliance.document.reviewed' }),
    );
  });

  it('throws COMPLIANCE_DOCUMENT_NOT_FOUND for invalid id', async () => {
    mockPrisma.complianceDocument.findUnique.mockResolvedValue(null);

    await expect(service.getDocument('nonexistent')).rejects.toThrow(DomainException);
    await expect(service.getDocument('nonexistent')).rejects.toMatchObject({
      errorCode: 'COMPLIANCE_DOCUMENT_NOT_FOUND',
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { DocEvaluationProcessor } from './doc-evaluation.processor.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { RedisService } from '../../../common/redis/redis.service.js';
import { EvaluationModelRegistry } from '../models/evaluation-model.registry.js';
import { EvaluationRubricService } from '../services/evaluation-rubric.service.js';
import { EVALUATION_PROVIDER } from '../providers/evaluation-provider.interface.js';
import { AuditService } from '../../compliance/audit/audit.service.js';
import type { Job } from 'bullmq';
import type { DocEvaluationJobData } from './doc-evaluation.processor.js';

const mockPrisma = {
  contribution: {
    findUniqueOrThrow: vi.fn(),
  },
  evaluation: {
    update: vi.fn(),
  },
  $transaction: vi.fn((fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)),
};

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
};

const mockModelRegistry = {
  getActiveModel: vi.fn(),
};

const mockRubricService = {
  getActiveRubric: vi.fn(),
};

const mockEvaluationProvider = {
  evaluateCode: vi.fn(),
  evaluateDocumentation: vi.fn(),
};

const mockAuditService = { log: vi.fn().mockResolvedValue(undefined) };

function createJob(data: Partial<DocEvaluationJobData> = {}): Job<DocEvaluationJobData> {
  return {
    id: 'job-1',
    data: {
      evaluationId: 'eval-1',
      contributionId: 'contrib-1',
      contributionType: 'DOCUMENTATION',
      contributorId: 'contributor-1',
      correlationId: 'corr-1',
      ...data,
    },
    attemptsMade: 0,
    opts: { attempts: 3 },
  } as unknown as Job<DocEvaluationJobData>;
}

const mockContribution = {
  id: 'contrib-1',
  contributionType: 'DOCUMENTATION',
  title: 'Update API documentation',
  description: 'Adds endpoint reference for v2 API',
  rawData: {
    files: [
      {
        filename: 'docs/api-reference.md',
        status: 'modified',
        additions: 50,
        deletions: 10,
        patch: '# API Reference\n\n## Endpoints\n\n### GET /api/v1/users\n\nReturns list of users.',
      },
    ],
    documentType: 'API_DOC',
  },
  sourceRef: 'abc123',
  repository: { fullName: 'org/repo' },
  contributor: { domain: 'Technology' },
};

const mockModel = {
  id: 'model-1',
  name: 'doc-evaluator',
  version: 'v1.0.0',
  provider: 'anthropic',
  apiModelId: 'claude-sonnet-4-5-20250514',
  evaluationType: 'DOCUMENTATION',
  config: { modelId: 'claude-sonnet-4-5-20250514', promptVersion: 'doc-eval-v1' },
};

const mockRubric = {
  id: 'rubric-1',
  evaluationType: 'DOCUMENTATION',
  documentType: null,
  parameters: {
    targetFleschKincaidRange: { min: 30, max: 60 },
    requiredSections: ['Introduction', 'Usage'],
  },
  version: 'v1.0.0',
  isActive: true,
  createdAt: '2026-03-01T00:00:00.000Z',
};

const mockDocEvaluationResult = {
  dimensions: {
    structuralCompleteness: { score: 85, explanation: 'All required sections present' },
    readability: { score: 75, explanation: 'Good readability level' },
    referenceIntegrity: { score: 90, explanation: 'All links valid' },
  },
  narrative: 'Well-structured documentation with clear content.',
  rawModelOutput: '{ "structuralCompleteness": ... }',
};

describe('DocEvaluationProcessor', () => {
  let processor: DocEvaluationProcessor;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        DocEvaluationProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: EvaluationModelRegistry, useValue: mockModelRegistry },
        { provide: EvaluationRubricService, useValue: mockRubricService },
        { provide: EVALUATION_PROVIDER, useValue: mockEvaluationProvider },
        { provide: AuditService, useValue: mockAuditService },
        { provide: getQueueToken('doc-evaluation'), useValue: {} },
      ],
    }).compile();

    processor = module.get(DocEvaluationProcessor);
    eventEmitter = module.get(EventEmitter2);
  });

  it('processes documentation contribution and produces 3 dimension scores', async () => {
    mockPrisma.contribution.findUniqueOrThrow.mockResolvedValue(mockContribution);
    mockModelRegistry.getActiveModel.mockResolvedValue(mockModel);
    mockRubricService.getActiveRubric.mockResolvedValue(mockRubric);
    mockEvaluationProvider.evaluateDocumentation.mockResolvedValue(mockDocEvaluationResult);
    mockPrisma.evaluation.update.mockResolvedValue({});

    await processor.process(createJob());

    expect(mockEvaluationProvider.evaluateDocumentation).toHaveBeenCalledWith(
      expect.objectContaining({
        contributionId: 'contrib-1',
        repositoryName: 'org/repo',
        documentTitle: 'Update API documentation',
        documentType: 'API_DOC',
      }),
    );
  });

  it('computes composite score with doc-specific weights', async () => {
    mockPrisma.contribution.findUniqueOrThrow.mockResolvedValue(mockContribution);
    mockModelRegistry.getActiveModel.mockResolvedValue(mockModel);
    mockRubricService.getActiveRubric.mockResolvedValue(mockRubric);
    mockEvaluationProvider.evaluateDocumentation.mockResolvedValue(mockDocEvaluationResult);
    mockPrisma.evaluation.update.mockResolvedValue({});

    await processor.process(createJob());

    // Expected: (85*0.35 + 75*0.35 + 90*0.30) * 1.0 * 1.0
    // = (29.75 + 26.25 + 27.0) = 83.0 → Math.round → 83
    expect(mockPrisma.evaluation.update).toHaveBeenCalledWith({
      where: { id: 'eval-1' },
      data: expect.objectContaining({
        status: 'COMPLETED',
        compositeScore: 83,
        formulaVersion: 'v1.0.0',
      }),
    });
  });

  it('persists rubric ID and model ID with evaluation result', async () => {
    mockPrisma.contribution.findUniqueOrThrow.mockResolvedValue(mockContribution);
    mockModelRegistry.getActiveModel.mockResolvedValue(mockModel);
    mockRubricService.getActiveRubric.mockResolvedValue(mockRubric);
    mockEvaluationProvider.evaluateDocumentation.mockResolvedValue(mockDocEvaluationResult);
    mockPrisma.evaluation.update.mockResolvedValue({});

    await processor.process(createJob());

    expect(mockPrisma.evaluation.update).toHaveBeenCalledWith({
      where: { id: 'eval-1' },
      data: expect.objectContaining({
        modelId: 'model-1',
        rubricId: 'rubric-1',
        rawInputs: expect.objectContaining({
          rubricId: 'rubric-1',
          rubricVersion: 'v1.0.0',
        }),
      }),
    });
  });

  it('emits evaluation.score.completed event on success', async () => {
    mockPrisma.contribution.findUniqueOrThrow.mockResolvedValue(mockContribution);
    mockModelRegistry.getActiveModel.mockResolvedValue(mockModel);
    mockRubricService.getActiveRubric.mockResolvedValue(mockRubric);
    mockEvaluationProvider.evaluateDocumentation.mockResolvedValue(mockDocEvaluationResult);
    mockPrisma.evaluation.update.mockResolvedValue({});

    const emitSpy = vi.spyOn(eventEmitter, 'emit');

    await processor.process(createJob());

    expect(emitSpy).toHaveBeenCalledWith(
      'evaluation.score.completed',
      expect.objectContaining({
        eventType: 'evaluation.score.completed',
        payload: expect.objectContaining({
          evaluationId: 'eval-1',
          contributionId: 'contrib-1',
          contributionType: 'DOCUMENTATION',
          compositeScore: 83,
          domain: 'Technology',
        }),
      }),
    );
  });

  it('caches result in Redis', async () => {
    mockPrisma.contribution.findUniqueOrThrow.mockResolvedValue(mockContribution);
    mockModelRegistry.getActiveModel.mockResolvedValue(mockModel);
    mockRubricService.getActiveRubric.mockResolvedValue(mockRubric);
    mockEvaluationProvider.evaluateDocumentation.mockResolvedValue(mockDocEvaluationResult);
    mockPrisma.evaluation.update.mockResolvedValue({});

    await processor.process(createJob());

    expect(mockRedis.set).toHaveBeenCalledWith(
      'evaluation:contrib-1',
      expect.objectContaining({
        evaluationId: 'eval-1',
        status: 'COMPLETED',
        compositeScore: 83,
      }),
      86400,
    );
  });

  it('passes apiModelId from registry to evaluation provider', async () => {
    mockPrisma.contribution.findUniqueOrThrow.mockResolvedValue(mockContribution);
    mockModelRegistry.getActiveModel.mockResolvedValue(mockModel);
    mockRubricService.getActiveRubric.mockResolvedValue(mockRubric);
    mockEvaluationProvider.evaluateDocumentation.mockResolvedValue(mockDocEvaluationResult);
    mockPrisma.evaluation.update.mockResolvedValue({});

    await processor.process(createJob());

    expect(mockEvaluationProvider.evaluateDocumentation).toHaveBeenCalledWith(
      expect.objectContaining({
        modelId: 'claude-sonnet-4-5-20250514',
      }),
    );
  });

  it('handles missing rubric gracefully', async () => {
    mockPrisma.contribution.findUniqueOrThrow.mockResolvedValue(mockContribution);
    mockModelRegistry.getActiveModel.mockResolvedValue(mockModel);
    mockRubricService.getActiveRubric.mockResolvedValue(null);
    mockEvaluationProvider.evaluateDocumentation.mockResolvedValue(mockDocEvaluationResult);
    mockPrisma.evaluation.update.mockResolvedValue({});

    await processor.process(createJob());

    expect(mockPrisma.evaluation.update).toHaveBeenCalledWith({
      where: { id: 'eval-1' },
      data: expect.objectContaining({
        rubricId: null,
      }),
    });
  });

  it('updates status to FAILED on provider error', async () => {
    mockPrisma.contribution.findUniqueOrThrow.mockResolvedValue(mockContribution);
    mockModelRegistry.getActiveModel.mockResolvedValue(mockModel);
    mockRubricService.getActiveRubric.mockResolvedValue(mockRubric);
    mockEvaluationProvider.evaluateDocumentation.mockRejectedValue(new Error('API timeout'));
    mockPrisma.evaluation.update.mockResolvedValue({});

    await expect(processor.process(createJob())).rejects.toThrow('API timeout');

    expect(mockPrisma.evaluation.update).toHaveBeenCalledWith({
      where: { id: 'eval-1' },
      data: { status: 'FAILED' },
    });
  });
});

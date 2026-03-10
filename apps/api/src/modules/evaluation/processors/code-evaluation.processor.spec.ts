import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { CodeEvaluationProcessor } from './code-evaluation.processor.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { RedisService } from '../../../common/redis/redis.service.js';
import { EvaluationModelRegistry } from '../models/evaluation-model.registry.js';
import { EVALUATION_PROVIDER } from '../providers/evaluation-provider.interface.js';
import { AuditService } from '../../compliance/audit/audit.service.js';
import type { Job } from 'bullmq';
import type { CodeEvaluationJobData } from './code-evaluation.processor.js';

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

const mockEvaluationProvider = {
  evaluateCode: vi.fn(),
};

const mockAuditService = { log: vi.fn().mockResolvedValue(undefined) };

function createJob(data: Partial<CodeEvaluationJobData> = {}): Job<CodeEvaluationJobData> {
  return {
    id: 'job-1',
    data: {
      evaluationId: 'eval-1',
      contributionId: 'contrib-1',
      contributionType: 'COMMIT',
      contributorId: 'contributor-1',
      correlationId: 'corr-1',
      ...data,
    },
    attemptsMade: 0,
    opts: { attempts: 3 },
  } as unknown as Job<CodeEvaluationJobData>;
}

const mockContribution = {
  id: 'contrib-1',
  contributionType: 'COMMIT',
  title: 'Fix bug in auth module',
  description: 'Fixes the login flow',
  rawData: {
    message: 'fix: auth bug',
    files: [
      { filename: 'src/auth.ts', status: 'modified', additions: 10, deletions: 5, patch: '+ code' },
      {
        filename: 'src/auth.test.ts',
        status: 'added',
        additions: 20,
        deletions: 0,
        patch: '+ tests',
      },
    ],
  },
  sourceRef: 'abc123',
  repository: { fullName: 'org/repo' },
  contributor: { domain: 'Technology' },
};

const mockModel = {
  id: 'model-1',
  name: 'code-evaluator',
  version: 'v1.0.0',
  provider: 'anthropic',
  config: { modelId: 'claude-sonnet-4-5-20250514', promptVersion: 'code-eval-v1' },
};

const mockEvaluationResult = {
  dimensions: {
    complexity: { score: 80, explanation: 'Good complexity' },
    maintainability: { score: 85, explanation: 'Well structured' },
    testCoverage: { score: 70, explanation: 'Tests present' },
    standardsAdherence: { score: 90, explanation: 'Follows conventions' },
  },
  narrative: 'Good code quality demonstrated.',
  rawModelOutput: '{ "complexity": ... }',
};

describe('CodeEvaluationProcessor', () => {
  let processor: CodeEvaluationProcessor;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        CodeEvaluationProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: EvaluationModelRegistry, useValue: mockModelRegistry },
        { provide: EVALUATION_PROVIDER, useValue: mockEvaluationProvider },
        { provide: AuditService, useValue: mockAuditService },
        { provide: getQueueToken('code-evaluation'), useValue: {} },
      ],
    }).compile();

    processor = module.get(CodeEvaluationProcessor);
    eventEmitter = module.get(EventEmitter2);
  });

  it('processes code contribution and produces 4 dimension scores', async () => {
    mockPrisma.contribution.findUniqueOrThrow.mockResolvedValue(mockContribution);
    mockModelRegistry.getActiveModel.mockResolvedValue(mockModel);
    mockEvaluationProvider.evaluateCode.mockResolvedValue(mockEvaluationResult);
    mockPrisma.evaluation.update.mockResolvedValue({});

    await processor.process(createJob());

    expect(mockEvaluationProvider.evaluateCode).toHaveBeenCalledWith(
      expect.objectContaining({
        contributionId: 'contrib-1',
        repositoryName: 'org/repo',
        files: expect.arrayContaining([expect.objectContaining({ filename: 'src/auth.ts' })]),
      }),
    );
  });

  it('computes composite score with correct formula and weights', async () => {
    mockPrisma.contribution.findUniqueOrThrow.mockResolvedValue(mockContribution);
    mockModelRegistry.getActiveModel.mockResolvedValue(mockModel);
    mockEvaluationProvider.evaluateCode.mockResolvedValue(mockEvaluationResult);
    mockPrisma.evaluation.update.mockResolvedValue({});

    await processor.process(createJob());

    // Expected: (80*0.20 + 85*0.35 + 70*0.25 + 90*0.20) * 1.0 * 1.0
    // = (16 + 29.75 + 17.5 + 18) = 81.25 → Math.round → 81
    expect(mockPrisma.evaluation.update).toHaveBeenCalledWith({
      where: { id: 'eval-1' },
      data: expect.objectContaining({
        status: 'COMPLETED',
        compositeScore: 81,
        formulaVersion: 'v1.0.0',
      }),
    });
  });

  it('persists evaluation result with full provenance', async () => {
    mockPrisma.contribution.findUniqueOrThrow.mockResolvedValue(mockContribution);
    mockModelRegistry.getActiveModel.mockResolvedValue(mockModel);
    mockEvaluationProvider.evaluateCode.mockResolvedValue(mockEvaluationResult);
    mockPrisma.evaluation.update.mockResolvedValue({});

    await processor.process(createJob());

    expect(mockPrisma.evaluation.update).toHaveBeenCalledWith({
      where: { id: 'eval-1' },
      data: expect.objectContaining({
        modelId: 'model-1',
        narrative: 'Good code quality demonstrated.',
        rawInputs: expect.objectContaining({
          formulaVersion: 'v1.0.0',
          modelPromptVersion: 'code-eval-v1',
        }),
        metadata: expect.objectContaining({
          rawModelOutput: '{ "complexity": ... }',
        }),
      }),
    });
  });

  it('emits evaluation.score.completed event with correct payload', async () => {
    mockPrisma.contribution.findUniqueOrThrow.mockResolvedValue(mockContribution);
    mockModelRegistry.getActiveModel.mockResolvedValue(mockModel);
    mockEvaluationProvider.evaluateCode.mockResolvedValue(mockEvaluationResult);
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
          contributorId: 'contributor-1',
          contributionTitle: 'Fix bug in auth module',
          compositeScore: 81,
          domain: 'Technology',
        }),
      }),
    );
  });

  it('caches score in Redis', async () => {
    mockPrisma.contribution.findUniqueOrThrow.mockResolvedValue(mockContribution);
    mockModelRegistry.getActiveModel.mockResolvedValue(mockModel);
    mockEvaluationProvider.evaluateCode.mockResolvedValue(mockEvaluationResult);
    mockPrisma.evaluation.update.mockResolvedValue({});

    await processor.process(createJob());

    expect(mockRedis.set).toHaveBeenCalledWith(
      'evaluation:contrib-1',
      expect.objectContaining({
        evaluationId: 'eval-1',
        status: 'COMPLETED',
        compositeScore: 81,
        contributorId: 'contributor-1',
      }),
      86400,
    );
  });

  it('updates status to FAILED on provider error', async () => {
    mockPrisma.contribution.findUniqueOrThrow.mockResolvedValue(mockContribution);
    mockModelRegistry.getActiveModel.mockResolvedValue(mockModel);
    mockEvaluationProvider.evaluateCode.mockRejectedValue(new Error('API timeout'));
    mockPrisma.evaluation.update.mockResolvedValue({});

    await expect(processor.process(createJob())).rejects.toThrow('API timeout');

    expect(mockPrisma.evaluation.update).toHaveBeenCalledWith({
      where: { id: 'eval-1' },
      data: { status: 'FAILED' },
    });
  });

  it('applies task complexity multiplier based on contribution size', async () => {
    // Large contribution — 15 files, ~600 lines → multiplier 1.10
    const largeContribution = {
      ...mockContribution,
      rawData: {
        files: Array.from({ length: 15 }, (_, i) => ({
          filename: `src/file-${i}.ts`,
          status: 'modified',
          additions: 30,
          deletions: 10,
          patch: '+ code',
        })),
      },
    };

    mockPrisma.contribution.findUniqueOrThrow.mockResolvedValue(largeContribution);
    mockModelRegistry.getActiveModel.mockResolvedValue(mockModel);
    mockEvaluationProvider.evaluateCode.mockResolvedValue(mockEvaluationResult);
    mockPrisma.evaluation.update.mockResolvedValue({});

    await processor.process(createJob());

    // 81.25 * 1.10 = 89.375 → Math.round → 89
    expect(mockPrisma.evaluation.update).toHaveBeenCalledWith({
      where: { id: 'eval-1' },
      data: expect.objectContaining({
        compositeScore: 89,
      }),
    });
  });
});

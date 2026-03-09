import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { EvaluationDispatchProcessor } from './evaluation-dispatch.processor.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { Job } from 'bullmq';
import type { EvaluationDispatchJobData } from './evaluation-dispatch.processor.js';

const mockPrisma = {
  evaluation: {
    update: vi.fn(),
  },
};

const mockCodeEvaluationQueue = {
  add: vi.fn(),
};

const mockDocEvaluationQueue = {
  add: vi.fn(),
};

function createJob(
  overrides: Partial<EvaluationDispatchJobData> = {},
): Job<EvaluationDispatchJobData> {
  return {
    id: 'job-1',
    data: {
      evaluationId: 'eval-1',
      contributionId: 'contrib-1',
      contributionType: 'COMMIT',
      contributorId: 'contributor-1',
      correlationId: 'corr-1',
      ...overrides,
    },
    attemptsMade: 0,
    opts: { attempts: 3 },
  } as unknown as Job<EvaluationDispatchJobData>;
}

describe('EvaluationDispatchProcessor', () => {
  let processor: EvaluationDispatchProcessor;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        EvaluationDispatchProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('code-evaluation'), useValue: mockCodeEvaluationQueue },
        { provide: getQueueToken('doc-evaluation'), useValue: mockDocEvaluationQueue },
        { provide: getQueueToken('evaluation-dispatch'), useValue: {} },
      ],
    }).compile();

    processor = module.get(EvaluationDispatchProcessor);
  });

  it('updates evaluation status to IN_PROGRESS', async () => {
    mockPrisma.evaluation.update.mockResolvedValue({});
    mockCodeEvaluationQueue.add.mockResolvedValue({});

    await processor.process(createJob());

    expect(mockPrisma.evaluation.update).toHaveBeenCalledWith({
      where: { id: 'eval-1' },
      data: { status: 'IN_PROGRESS', startedAt: expect.any(Date) },
    });
  });

  it('routes COMMIT to code-evaluation queue', async () => {
    mockPrisma.evaluation.update.mockResolvedValue({});
    mockCodeEvaluationQueue.add.mockResolvedValue({});

    await processor.process(createJob({ contributionType: 'COMMIT' }));

    expect(mockCodeEvaluationQueue.add).toHaveBeenCalledWith(
      'evaluate-code',
      expect.objectContaining({
        evaluationId: 'eval-1',
        contributionType: 'COMMIT',
      }),
      expect.objectContaining({ jobId: 'code-eval-eval-1' }),
    );
  });

  it('routes PULL_REQUEST to code-evaluation queue', async () => {
    mockPrisma.evaluation.update.mockResolvedValue({});
    mockCodeEvaluationQueue.add.mockResolvedValue({});

    await processor.process(createJob({ contributionType: 'PULL_REQUEST' }));

    expect(mockCodeEvaluationQueue.add).toHaveBeenCalledWith(
      'evaluate-code',
      expect.objectContaining({
        contributionType: 'PULL_REQUEST',
      }),
      expect.any(Object),
    );
  });

  it('routes DOCUMENTATION to doc-evaluation queue', async () => {
    mockPrisma.evaluation.update.mockResolvedValue({});
    mockDocEvaluationQueue.add.mockResolvedValue({});

    await processor.process(createJob({ contributionType: 'DOCUMENTATION' }));

    expect(mockCodeEvaluationQueue.add).not.toHaveBeenCalled();
    expect(mockDocEvaluationQueue.add).toHaveBeenCalledWith(
      'evaluate-doc',
      expect.objectContaining({
        evaluationId: 'eval-1',
        contributionType: 'DOCUMENTATION',
      }),
      expect.objectContaining({ jobId: 'doc-eval-eval-1' }),
    );
  });

  it('marks evaluation as FAILED on error and rethrows', async () => {
    mockPrisma.evaluation.update
      .mockRejectedValueOnce(new Error('DB unavailable'))
      .mockResolvedValueOnce({});

    await expect(processor.process(createJob())).rejects.toThrow('DB unavailable');

    expect(mockPrisma.evaluation.update).toHaveBeenCalledWith({
      where: { id: 'eval-1' },
      data: { status: 'FAILED' },
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { ZenhubPollingProcessor } from './zenhub-polling.processor.js';
import { ZenhubPollingService } from './zenhub-polling.service.js';
import type { ZenhubPollingJobData } from './zenhub-polling.service.js';

const mockPollingService = {
  executePoll: vi.fn(),
};

const mockDlqQueue = {
  add: vi.fn(),
};

function createMockJob(
  data: ZenhubPollingJobData,
  overrides: Partial<Job<ZenhubPollingJobData>> = {},
): Job<ZenhubPollingJobData> {
  return {
    id: 'job-1',
    data,
    attemptsMade: 0,
    opts: { attempts: 3 },
    ...overrides,
  } as unknown as Job<ZenhubPollingJobData>;
}

describe('ZenhubPollingProcessor', () => {
  let processor: ZenhubPollingProcessor;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        ZenhubPollingProcessor,
        { provide: ZenhubPollingService, useValue: mockPollingService },
        { provide: getQueueToken('zenhub-polling-dlq'), useValue: mockDlqQueue },
      ],
    }).compile();

    processor = module.get(ZenhubPollingProcessor);
  });

  it('calls pollingService.executePoll on successful processing', async () => {
    mockPollingService.executePoll.mockResolvedValue(undefined);
    const job = createMockJob({
      correlationId: 'corr-1',
      triggeredBy: 'schedule',
    });

    await processor.process(job);

    expect(mockPollingService.executePoll).toHaveBeenCalledWith('corr-1');
  });

  it('rethrows error for BullMQ retry when retries remain', async () => {
    mockPollingService.executePoll.mockRejectedValue(new Error('API down'));
    const job = createMockJob(
      { correlationId: 'corr-2', triggeredBy: 'schedule' },
      { attemptsMade: 0, opts: { attempts: 3 } },
    );

    await expect(processor.process(job)).rejects.toThrow('API down');
    expect(mockDlqQueue.add).not.toHaveBeenCalled();
  });

  it('moves to DLQ after max retries exhausted', async () => {
    mockPollingService.executePoll.mockRejectedValue(new Error('Persistent failure'));
    const job = createMockJob(
      { correlationId: 'corr-3', triggeredBy: 'manual' },
      { attemptsMade: 2, opts: { attempts: 3 } },
    );

    await expect(processor.process(job)).rejects.toThrow('Persistent failure');

    expect(mockDlqQueue.add).toHaveBeenCalledWith(
      'dead-letter-zenhub-poll',
      expect.objectContaining({
        correlationId: 'corr-3',
        triggeredBy: 'manual',
        errorMessage: 'Persistent failure',
      }),
      expect.objectContaining({
        removeOnComplete: true,
        removeOnFail: false,
      }),
    );
  });
});

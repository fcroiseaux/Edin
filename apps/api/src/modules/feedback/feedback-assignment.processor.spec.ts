import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { FeedbackAssignmentProcessor } from './feedback-assignment.processor.js';
import { FeedbackService } from './feedback.service.js';
import type { Job } from 'bullmq';
import type { FeedbackAssignmentJobData } from './feedback.service.js';

const mockFeedbackService = {
  assignReviewer: vi.fn(),
};

const mockDlqQueue = {
  add: vi.fn(),
};

const mockFeedbackQueue = {
  add: vi.fn(),
};

function createMockJob(
  data: FeedbackAssignmentJobData,
  overrides: Partial<Job<FeedbackAssignmentJobData>> = {},
): Job<FeedbackAssignmentJobData> {
  return {
    id: 'job-1',
    data,
    attemptsMade: 0,
    opts: { attempts: 3 },
    ...overrides,
  } as Job<FeedbackAssignmentJobData>;
}

describe('FeedbackAssignmentProcessor', () => {
  let processor: FeedbackAssignmentProcessor;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        FeedbackAssignmentProcessor,
        { provide: FeedbackService, useValue: mockFeedbackService },
        { provide: getQueueToken('feedback-assignment-dlq'), useValue: mockDlqQueue },
        { provide: getQueueToken('feedback-assignment'), useValue: mockFeedbackQueue },
      ],
    }).compile();

    processor = module.get(FeedbackAssignmentProcessor);
  });

  it('calls feedbackService.assignReviewer', async () => {
    mockFeedbackService.assignReviewer.mockResolvedValue({
      peerFeedbackId: 'pf-1',
      reviewerId: 'reviewer-1',
    });

    const job = createMockJob({
      contributionId: 'contrib-1',
      contributorId: 'author-1',
      contributorDomain: 'Technology',
      contributionTitle: 'Fix bug',
      contributionType: 'COMMIT',
      correlationId: 'corr-1',
    });

    await processor.process(job);

    expect(mockFeedbackService.assignReviewer).toHaveBeenCalledWith('contrib-1', 'corr-1');
  });

  it('logs warning on no eligible reviewer', async () => {
    mockFeedbackService.assignReviewer.mockResolvedValue(null);

    const job = createMockJob({
      contributionId: 'contrib-1',
      contributorId: 'author-1',
      contributorDomain: 'Technology',
      contributionTitle: 'Fix bug',
      contributionType: 'COMMIT',
      correlationId: 'corr-1',
    });

    // Should not throw
    await processor.process(job);

    expect(mockFeedbackService.assignReviewer).toHaveBeenCalled();
  });

  it('completes without error when no reviewer found', async () => {
    mockFeedbackService.assignReviewer.mockResolvedValue(null);

    const job = createMockJob({
      contributionId: 'contrib-1',
      contributorId: 'author-1',
      contributorDomain: 'Technology',
      contributionTitle: 'Fix bug',
      contributionType: 'COMMIT',
      correlationId: 'corr-1',
    });

    // Should complete without throwing
    await expect(processor.process(job)).resolves.toBeUndefined();
  });

  it('moves failed job to DLQ on max retries', async () => {
    const error = new Error('DB connection failed');
    mockFeedbackService.assignReviewer.mockRejectedValue(error);
    mockDlqQueue.add.mockResolvedValue({ id: 'dlq-1' });

    const job = createMockJob(
      {
        contributionId: 'contrib-1',
        contributorId: 'author-1',
        contributorDomain: 'Technology',
        contributionTitle: 'Fix bug',
        contributionType: 'COMMIT',
        correlationId: 'corr-1',
      },
      { attemptsMade: 2 }, // 3rd attempt (0-indexed)
    );

    await expect(processor.process(job)).rejects.toThrow('DB connection failed');

    expect(mockDlqQueue.add).toHaveBeenCalledWith(
      'dead-letter-feedback-assignment',
      expect.objectContaining({
        contributionId: 'contrib-1',
        errorMessage: 'DB connection failed',
      }),
      expect.any(Object),
    );
  });
});

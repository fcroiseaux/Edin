import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { FeedbackService } from './feedback.service.js';
import type { FeedbackAssignmentJobData } from './feedback.service.js';

@Processor('feedback-assignment')
export class FeedbackAssignmentProcessor extends WorkerHost {
  private readonly logger = new Logger(FeedbackAssignmentProcessor.name);

  constructor(
    private readonly feedbackService: FeedbackService,
    @InjectQueue('feedback-assignment-dlq')
    private readonly feedbackDlqQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<FeedbackAssignmentJobData>): Promise<void> {
    const { contributionId, correlationId } = job.data;

    this.logger.log('Processing feedback assignment job', {
      module: 'feedback',
      jobId: job.id,
      contributionId,
      correlationId,
    });

    try {
      const result = await this.feedbackService.assignReviewer(contributionId, correlationId);

      if (result) {
        this.logger.log('Feedback assignment succeeded', {
          module: 'feedback',
          jobId: job.id,
          contributionId,
          reviewerId: result.reviewerId,
          correlationId,
        });
      } else {
        this.logger.warn('No eligible reviewer found for contribution', {
          module: 'feedback',
          jobId: job.id,
          contributionId,
          correlationId,
        });
      }
    } catch (error) {
      const attemptsMade = job.attemptsMade + 1;
      const maxAttempts = job.opts?.attempts || 3;

      if (attemptsMade >= maxAttempts) {
        await this.feedbackDlqQueue.add(
          'dead-letter-feedback-assignment',
          {
            ...job.data,
            failedAt: new Date().toISOString(),
            errorMessage: error instanceof Error ? error.message : String(error),
          },
          {
            removeOnComplete: true,
            removeOnFail: false,
          },
        );

        this.logger.warn('Feedback assignment failed after all retries', {
          module: 'feedback',
          jobId: job.id,
          contributionId,
          attempts: attemptsMade,
          correlationId,
          error: error instanceof Error ? error.message : String(error),
        });
      } else {
        this.logger.warn('Feedback assignment attempt failed, will retry', {
          module: 'feedback',
          jobId: job.id,
          contributionId,
          attempt: attemptsMade,
          maxAttempts,
          correlationId,
          error: error instanceof Error ? error.message : String(error),
        });
      }

      throw error;
    }
  }
}

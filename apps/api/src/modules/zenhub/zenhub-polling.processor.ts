import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { ZenhubPollingService } from './zenhub-polling.service.js';
import type { ZenhubPollingJobData } from './zenhub-polling.service.js';

@Processor('zenhub-polling')
export class ZenhubPollingProcessor extends WorkerHost {
  private readonly logger = new Logger(ZenhubPollingProcessor.name);

  constructor(
    private readonly pollingService: ZenhubPollingService,
    @InjectQueue('zenhub-polling-dlq')
    private readonly dlqQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<ZenhubPollingJobData>): Promise<void> {
    const { correlationId, triggeredBy } = job.data;

    this.logger.log('Starting Zenhub polling job', {
      jobId: job.id,
      triggeredBy,
      correlationId,
    });

    try {
      await this.pollingService.executePoll(correlationId);

      this.logger.log('Zenhub polling job completed', {
        jobId: job.id,
        correlationId,
      });
    } catch (error) {
      const attemptsMade = job.attemptsMade + 1;
      const maxAttempts = job.opts?.attempts || 3;

      if (attemptsMade >= maxAttempts) {
        await this.dlqQueue.add(
          'dead-letter-zenhub-poll',
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

        this.logger.warn('Zenhub polling failed after all retries, moved to DLQ', {
          jobId: job.id,
          attempts: attemptsMade,
          correlationId,
          error: error instanceof Error ? error.message : String(error),
        });
      } else {
        this.logger.warn('Zenhub polling attempt failed, will retry', {
          jobId: job.id,
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

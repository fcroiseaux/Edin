import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

export interface WebhookJobData {
  eventType: string;
  repositoryFullName: string;
  payload: Record<string, unknown>;
  deliveryId: string;
}

@Processor('github-ingestion')
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  // eslint-disable-next-line @typescript-eslint/require-await
  async process(job: Job<WebhookJobData>): Promise<void> {
    this.logger.log('Processing webhook event', {
      jobId: job.id,
      eventType: job.data.eventType,
      repository: job.data.repositoryFullName,
      deliveryId: job.data.deliveryId,
    });

    // Stub: Full processing logic will be implemented in Story 4-2
    this.logger.debug('Webhook payload received (stub processor)', {
      jobId: job.id,
      eventType: job.data.eventType,
      repository: job.data.repositoryFullName,
    });
  }
}

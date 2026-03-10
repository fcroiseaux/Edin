import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';

export interface DataDeletionJobData {
  requestId: string;
  contributorId: string;
  pseudonymId: string;
  correlationId: string;
}

@Processor('gdpr-deletion')
export class DataDeletionProcessor extends WorkerHost {
  private readonly logger = new Logger(DataDeletionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {
    super();
  }

  async process(job: Job<DataDeletionJobData>): Promise<void> {
    const { contributorId, requestId: deletionRequestId, pseudonymId, correlationId } = job.data;

    this.logger.log('Starting data deletion', {
      module: 'gdpr',
      jobId: job.id,
      deletionRequestId,
      contributorId,
      correlationId,
    });

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.contributor.update({
          where: { id: contributorId },
          data: {
            name: '[deleted]',
            email: null,
            bio: null,
            githubId: 0,
            githubUsername: null,
            avatarUrl: null,
            isActive: false,
          },
        });

        await tx.dataDeletionRequest.update({
          where: { id: deletionRequestId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });

        await this.auditService.log(
          {
            actorId: contributorId,
            action: 'data.deletion.completed',
            entityType: 'Contributor',
            entityId: contributorId,
            details: { pseudonymId },
            correlationId,
          },
          tx,
        );
      });

      this.logger.log('Data deletion completed', {
        module: 'gdpr',
        deletionRequestId,
        contributorId,
        pseudonymId,
        correlationId,
      });
    } catch (error) {
      this.logger.error('Data deletion failed', {
        module: 'gdpr',
        deletionRequestId,
        contributorId,
        correlationId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }
}

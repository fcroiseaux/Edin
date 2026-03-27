import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { TrackRecordComputeService } from '../services/track-record-compute.service.js';
import { MilestoneDetectionService } from '../services/milestone-detection.service.js';

const BATCH_SIZE = 50;

@Processor('track-record')
export class TrackRecordProcessor extends WorkerHost {
  private readonly logger = new Logger(TrackRecordProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly trackRecordComputeService: TrackRecordComputeService,
    private readonly milestoneDetectionService: MilestoneDetectionService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log('Starting track record batch computation', {
      module: 'evaluation',
      jobId: job.id,
    });

    let totalProcessed = 0;
    let totalMilestones = 0;
    let totalErrors = 0;
    let cursor: string | undefined;

    // Process active contributors in batches
    while (true) {
      const contributors = await this.prisma.contributor.findMany({
        where: { isActive: true },
        select: { id: true },
        take: BATCH_SIZE,
        orderBy: { id: 'asc' },
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });

      if (contributors.length === 0) {
        break;
      }

      for (const contributor of contributors) {
        try {
          const evaluation = await this.trackRecordComputeService.computeTrackRecord(
            contributor.id,
          );
          const milestones = await this.milestoneDetectionService.detectMilestones(
            contributor.id,
            evaluation,
          );
          totalMilestones += milestones.length;
          totalProcessed++;
        } catch (error: unknown) {
          totalErrors++;
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error('Failed to process contributor track record', {
            module: 'evaluation',
            contributorId: contributor.id,
            error: message,
          });
          // Continue to next contributor — don't fail the entire batch
        }
      }

      cursor = contributors[contributors.length - 1].id;

      this.logger.log('Batch progress', {
        module: 'evaluation',
        batchSize: contributors.length,
        totalProcessed,
        totalMilestones,
        totalErrors,
      });

      // Update job progress
      await job.updateProgress({
        totalProcessed,
        totalMilestones,
        totalErrors,
      });
    }

    this.logger.log('Track record batch computation complete', {
      module: 'evaluation',
      jobId: job.id,
      totalProcessed,
      totalMilestones,
      totalErrors,
    });
  }
}

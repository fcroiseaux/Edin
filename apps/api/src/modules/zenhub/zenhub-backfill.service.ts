import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface BackfillStatus {
  syncId: string;
  status: string;
  syncType: string;
  payload: unknown;
  errorMessage: string | null;
  receivedAt: Date;
  processedAt: Date | null;
}

@Injectable()
export class ZenhubBackfillService {
  private readonly logger = new Logger(ZenhubBackfillService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('zenhub-polling')
    private readonly pollingQueue: Queue,
  ) {}

  async triggerBackfill(
    adminId: string,
    correlationId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{ jobId: string; syncId: string }> {
    const deliveryId = `backfill-${Date.now()}-${randomUUID().slice(0, 8)}`;

    // Create sync record to track this backfill request
    const syncRecord = await this.prisma.zenhubSync.create({
      data: {
        deliveryId,
        syncType: 'BACKFILL',
        status: 'RECEIVED',
        eventType: 'backfill.manual',
        correlationId,
        payload: {
          triggeredBy: adminId,
          startDate: startDate?.toISOString() ?? null,
          endDate: endDate?.toISOString() ?? null,
        } as never,
      },
    });

    // Enqueue the backfill job
    const job = await this.pollingQueue.add(
      'backfillHistoricalData',
      {
        correlationId,
        triggeredBy: 'manual' as const,
        syncId: syncRecord.id,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 60_000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log('Backfill triggered', {
      syncId: syncRecord.id,
      jobId: job.id,
      adminId,
      correlationId,
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    });

    return { jobId: job.id ?? deliveryId, syncId: syncRecord.id };
  }

  async getBackfillStatus(): Promise<BackfillStatus | null> {
    const latest = await this.prisma.zenhubSync.findFirst({
      where: { syncType: 'BACKFILL' },
      orderBy: { receivedAt: 'desc' },
    });

    if (!latest) return null;

    return {
      syncId: latest.id,
      status: latest.status,
      syncType: latest.syncType,
      payload: latest.payload,
      errorMessage: latest.errorMessage,
      receivedAt: latest.receivedAt,
      processedAt: latest.processedAt,
    };
  }
}

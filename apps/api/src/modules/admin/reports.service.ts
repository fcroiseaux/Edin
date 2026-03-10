import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { ReportConfig, GeneratedReport, ReportStatus } from '@edin/shared';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(@InjectQueue('admin-reports') private readonly reportsQueue: Queue) {}

  async createReport(config: ReportConfig, userId: string): Promise<GeneratedReport> {
    const job = await this.reportsQueue.add('generate-report', {
      config,
      createdBy: userId,
    });

    this.logger.log(`Report job enqueued: ${job.id}`);

    return {
      id: job.id!,
      config,
      status: 'queued',
      createdAt: new Date().toISOString(),
      completedAt: null,
      downloadUrl: null,
      createdBy: userId,
    };
  }

  async listReports(
    cursor?: string,
    limit = 20,
  ): Promise<{
    items: GeneratedReport[];
    hasMore: boolean;
  }> {
    // BullMQ stores completed jobs — retrieve them
    const completedJobs = await this.reportsQueue.getJobs(
      ['completed', 'failed', 'waiting', 'active'],
      0,
      limit + 1,
    );

    // Sort by timestamp descending
    const sorted = completedJobs.sort((a, b) => b.timestamp - a.timestamp);

    // Apply cursor-based pagination
    let startIdx = 0;
    if (cursor) {
      const cursorIdx = sorted.findIndex((j) => j.id === cursor);
      startIdx = cursorIdx >= 0 ? cursorIdx + 1 : 0;
    }

    const sliced = sorted.slice(startIdx, startIdx + limit + 1);
    const hasMore = sliced.length > limit;
    const items = sliced.slice(0, limit);

    return {
      items: await Promise.all(items.map((job) => this.jobToReport(job))),
      hasMore,
    };
  }

  async getReport(reportId: string): Promise<GeneratedReport | null> {
    const job = await this.reportsQueue.getJob(reportId);
    if (!job) return null;
    return this.jobToReport(job);
  }

  private async jobToReport(job: {
    id?: string;
    data: { config: ReportConfig; createdBy: string };
    timestamp: number;
    returnvalue?: unknown;
    failedReason?: string;
    getState: () => Promise<string>;
  }): Promise<GeneratedReport> {
    const state = await job.getState();
    const statusMap: Record<string, ReportStatus> = {
      waiting: 'queued',
      active: 'processing',
      completed: 'completed',
      failed: 'failed',
    };

    const result = job.returnvalue as { filePath?: string; completedAt?: string } | undefined;

    return {
      id: job.id!,
      config: job.data.config,
      status: statusMap[state] ?? 'queued',
      createdAt: new Date(job.timestamp).toISOString(),
      completedAt: result?.completedAt ?? null,
      downloadUrl: state === 'completed' ? `/api/v1/admin/reports/${job.id}/download` : null,
      createdBy: job.data.createdBy,
    };
  }
}

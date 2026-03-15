import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  ZenhubSyncLogEntry,
  IntegrationHealthSummary,
  IntegrationOverallStatus,
  ZenhubSyncLogQueryDto,
} from '@edin/shared';
import type { Prisma } from '../../../generated/prisma/client/client.js';

const SENSITIVE_KEYS = ['token', 'secret', 'key', 'password', 'credential'];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEYS.some((s) => lower.includes(s));
}

function sanitizePayload(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== 'object') return null;
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
    if (isSensitiveKey(k)) continue;
    result[k] = v;
  }
  return result;
}

@Injectable()
export class ZenhubSyncLogService {
  private readonly logger = new Logger(ZenhubSyncLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSyncLogs(query: ZenhubSyncLogQueryDto): Promise<{
    data: ZenhubSyncLogEntry[];
    pagination: { cursor: string | null; hasMore: boolean };
  }> {
    const where: Prisma.ZenhubSyncWhereInput = {};

    if (query.syncType) {
      where.syncType = query.syncType;
    }
    if (query.status) {
      where.status = query.status;
    }
    if (query.eventType) {
      where.eventType = query.eventType;
    }
    if (query.correlationId) {
      where.correlationId = query.correlationId;
    }
    if (query.startDate || query.endDate) {
      where.receivedAt = {};
      if (query.startDate) {
        where.receivedAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.receivedAt.lte = new Date(query.endDate);
      }
    }

    const limit = query.limit;

    const records = await this.prisma.zenhubSync.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      take: limit + 1,
      ...(query.cursor
        ? {
            skip: 1,
            cursor: { id: query.cursor },
          }
        : {}),
    });

    const hasMore = records.length > limit;
    const items = records.slice(0, limit);
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    const data: ZenhubSyncLogEntry[] = items.map((record) => {
      const safePayload = sanitizePayload(record.payload);
      let payloadSummary: string | null = null;
      let durationMs: number | null = null;
      let recordsSynced: number | null = null;

      if (safePayload) {
        if (record.syncType === 'POLL') {
          const sprintCount =
            typeof safePayload.sprintCount === 'number' ? safePayload.sprintCount : 0;
          const issueCount =
            typeof safePayload.issueCount === 'number' ? safePayload.issueCount : 0;
          durationMs = typeof safePayload.durationMs === 'number' ? safePayload.durationMs : null;
          recordsSynced = sprintCount + issueCount;
          payloadSummary = `${sprintCount} sprints, ${issueCount} issues`;
        } else {
          payloadSummary = record.eventType;
        }
      }

      return {
        id: record.id,
        deliveryId: record.deliveryId,
        syncType: record.syncType as ZenhubSyncLogEntry['syncType'],
        status: record.status as ZenhubSyncLogEntry['status'],
        eventType: record.eventType,
        correlationId: record.correlationId,
        errorMessage: record.errorMessage,
        retryCount: record.retryCount,
        receivedAt: record.receivedAt.toISOString(),
        processedAt: record.processedAt?.toISOString() ?? null,
        payloadSummary,
        durationMs,
        recordsSynced,
      };
    });

    return {
      data,
      pagination: { cursor: nextCursor, hasMore },
    };
  }

  async getHealthSummary(): Promise<IntegrationHealthSummary> {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Parallel queries for efficiency
    const [
      lastSuccessfulPoll,
      lastSuccessfulWebhook,
      webhookTotal24h,
      webhookFailed24h,
      recentCompletedPolls,
    ] = await Promise.all([
      this.prisma.zenhubSync.findFirst({
        where: { syncType: 'POLL', status: 'COMPLETED' },
        orderBy: { receivedAt: 'desc' },
        select: { receivedAt: true },
      }),
      this.prisma.zenhubSync.findFirst({
        where: { syncType: 'WEBHOOK', status: 'COMPLETED' },
        orderBy: { receivedAt: 'desc' },
        select: { receivedAt: true },
      }),
      this.prisma.zenhubSync.count({
        where: {
          syncType: 'WEBHOOK',
          receivedAt: { gte: twentyFourHoursAgo },
        },
      }),
      this.prisma.zenhubSync.count({
        where: {
          syncType: 'WEBHOOK',
          status: 'FAILED',
          receivedAt: { gte: twentyFourHoursAgo },
        },
      }),
      this.prisma.zenhubSync.findMany({
        where: { syncType: 'POLL', status: 'COMPLETED' },
        orderBy: { receivedAt: 'desc' },
        take: 10,
        select: { payload: true },
      }),
    ]);

    const webhookSuccessRate =
      webhookTotal24h > 0
        ? Math.round(((webhookTotal24h - webhookFailed24h) / webhookTotal24h) * 10000) / 100
        : 100;

    // Compute avg polling duration from payload.durationMs
    let pollingAvgDurationMs: number | null = null;
    if (recentCompletedPolls.length > 0) {
      let totalDuration = 0;
      let count = 0;
      for (const poll of recentCompletedPolls) {
        const payload = poll.payload as Record<string, unknown> | null;
        if (payload && typeof payload.durationMs === 'number') {
          totalDuration += payload.durationMs;
          count++;
        }
      }
      if (count > 0) {
        pollingAvgDurationMs = Math.round(totalDuration / count);
      }
    }

    // Determine overall status
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    let overallStatus: IntegrationOverallStatus = 'down';
    const lastPollTime = lastSuccessfulPoll?.receivedAt;

    if (webhookSuccessRate >= 99 && lastPollTime && lastPollTime >= thirtyMinutesAgo) {
      overallStatus = 'healthy';
    } else if (
      (webhookSuccessRate >= 90 || webhookTotal24h === 0) &&
      lastPollTime &&
      lastPollTime >= oneHourAgo
    ) {
      overallStatus = 'degraded';
    }

    return {
      lastSuccessfulPoll: lastSuccessfulPoll?.receivedAt.toISOString() ?? null,
      lastSuccessfulWebhook: lastSuccessfulWebhook?.receivedAt.toISOString() ?? null,
      webhookSuccessRate,
      webhookTotalLast24h: webhookTotal24h,
      webhookFailedLast24h: webhookFailed24h,
      pollingAvgDurationMs,
      overallStatus,
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { SettingsService } from '../settings/settings.service.js';
import type {
  ZenhubAlertConfig,
  ZenhubSyncConflictEntry,
  ZenhubSyncConflictResolution,
  UpdateZenhubAlertConfigDto,
  ZenhubSyncConflictQueryDto,
  ResolveZenhubSyncConflictDto,
  ZenhubSyncConflictDetail,
  ZenhubSyncConflictResolvedEvent,
} from '@edin/shared';
import type { SystemAlert, AlertSeverity } from '@edin/shared';
import type { Prisma } from '../../../generated/prisma/client/client.js';
import { createHash } from 'node:crypto';

const DISMISS_PREFIX = 'admin:alert:dismissed';
const DISMISS_TTL_SECONDS = 86400; // 24 hours

const KEYS = {
  WEBHOOK_FAILURE_THRESHOLD: 'zenhub.alert.webhook_failure_threshold',
  POLLING_TIMEOUT_MINUTES: 'zenhub.alert.polling_timeout_minutes',
  ENABLED: 'zenhub.alert.enabled',
} as const;

const DEFAULTS: ZenhubAlertConfig = {
  webhookFailureThreshold: 1,
  pollingTimeoutMinutes: 60,
  enabled: true,
};

@Injectable()
export class ZenhubAlertsService {
  private readonly logger = new Logger(ZenhubAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly settingsService: SettingsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getAlertConfig(): Promise<ZenhubAlertConfig> {
    const [webhookFailureThreshold, pollingTimeoutMinutes, enabled] = await Promise.all([
      this.settingsService.getSettingValue<number>(
        KEYS.WEBHOOK_FAILURE_THRESHOLD,
        DEFAULTS.webhookFailureThreshold,
      ),
      this.settingsService.getSettingValue<number>(
        KEYS.POLLING_TIMEOUT_MINUTES,
        DEFAULTS.pollingTimeoutMinutes,
      ),
      this.settingsService.getSettingValue<boolean>(KEYS.ENABLED, DEFAULTS.enabled),
    ]);

    return { webhookFailureThreshold, pollingTimeoutMinutes, enabled };
  }

  async updateAlertConfig(
    updates: UpdateZenhubAlertConfigDto,
    adminId: string,
    correlationId?: string,
  ): Promise<ZenhubAlertConfig> {
    if (updates.webhookFailureThreshold !== undefined) {
      await this.settingsService.updateSetting(
        KEYS.WEBHOOK_FAILURE_THRESHOLD,
        updates.webhookFailureThreshold,
        adminId,
        correlationId,
      );
    }
    if (updates.pollingTimeoutMinutes !== undefined) {
      await this.settingsService.updateSetting(
        KEYS.POLLING_TIMEOUT_MINUTES,
        updates.pollingTimeoutMinutes,
        adminId,
        correlationId,
      );
    }
    if (updates.enabled !== undefined) {
      await this.settingsService.updateSetting(
        KEYS.ENABLED,
        updates.enabled,
        adminId,
        correlationId,
      );
    }

    this.logger.log('Zenhub alert config updated', {
      updatedFields: Object.keys(updates),
      adminId,
      correlationId,
    });

    return this.getAlertConfig();
  }

  async getActiveAlerts(): Promise<SystemAlert[]> {
    const config = await this.getAlertConfig();
    if (!config.enabled) return [];

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const alerts: SystemAlert[] = [];

    // Check webhook failure rate
    const [webhookTotal, webhookFailed] = await Promise.all([
      this.prisma.zenhubSync.count({
        where: { syncType: 'WEBHOOK', receivedAt: { gte: twentyFourHoursAgo } },
      }),
      this.prisma.zenhubSync.count({
        where: {
          syncType: 'WEBHOOK',
          status: 'FAILED',
          receivedAt: { gte: twentyFourHoursAgo },
        },
      }),
    ]);

    if (webhookTotal > 0) {
      const failureRate = Math.round((webhookFailed / webhookTotal) * 10000) / 100;
      if (failureRate > config.webhookFailureThreshold) {
        const severity: AlertSeverity =
          failureRate > config.webhookFailureThreshold * 5 ? 'CRITICAL' : 'WARNING';
        alerts.push(
          await this.createAlert(
            'ZENHUB_WEBHOOK_FAILURE_RATE',
            severity,
            config.webhookFailureThreshold,
            failureRate,
            now,
            `Zenhub webhook failure rate is ${failureRate.toFixed(1)}% (threshold: ${config.webhookFailureThreshold}%). Check webhook delivery logs.`,
          ),
        );
      }
    }

    // Check polling timeout
    const lastSuccessfulPoll = await this.prisma.zenhubSync.findFirst({
      where: { syncType: 'POLL', status: 'COMPLETED' },
      orderBy: { receivedAt: 'desc' },
      select: { receivedAt: true },
    });

    if (lastSuccessfulPoll) {
      const minutesSinceLastPoll = Math.round(
        (now.getTime() - lastSuccessfulPoll.receivedAt.getTime()) / 60_000,
      );
      if (minutesSinceLastPoll > config.pollingTimeoutMinutes) {
        const severity: AlertSeverity =
          minutesSinceLastPoll > config.pollingTimeoutMinutes * 2 ? 'CRITICAL' : 'WARNING';
        alerts.push(
          await this.createAlert(
            'ZENHUB_POLLING_TIMEOUT',
            severity,
            config.pollingTimeoutMinutes,
            minutesSinceLastPoll,
            now,
            `Last successful Zenhub poll was ${minutesSinceLastPoll} minutes ago (threshold: ${config.pollingTimeoutMinutes}min). Check API connectivity.`,
          ),
        );
      }
    }

    return alerts;
  }

  async dismissAlert(alertId: string): Promise<boolean> {
    const key = `${DISMISS_PREFIX}:${alertId}`;
    await this.redis.set(key, { dismissed: true }, DISMISS_TTL_SECONDS);
    this.logger.log('Zenhub alert dismissed', { alertId });
    return true;
  }

  async getSyncConflicts(query: ZenhubSyncConflictQueryDto): Promise<{
    data: ZenhubSyncConflictEntry[];
    pagination: { cursor: string | null; hasMore: boolean };
  }> {
    const where: Prisma.ZenhubSyncConflictWhereInput = {};

    if (query.resolution) {
      where.resolution = query.resolution;
    }
    if (query.startDate || query.endDate) {
      where.occurredAt = {};
      if (query.startDate) {
        where.occurredAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.occurredAt.lte = new Date(query.endDate);
      }
    }

    const limit = query.limit;

    const records = await this.prisma.zenhubSyncConflict.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: limit + 1,
      ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
    });

    const hasMore = records.length > limit;
    const items = records.slice(0, limit);
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    const data: ZenhubSyncConflictEntry[] = items.map((record) => ({
      id: record.id,
      syncId: record.syncId,
      conflictType: record.conflictType,
      affectedEntity: record.affectedEntity,
      affectedEntityId: record.affectedEntityId,
      resolution: record.resolution as ZenhubSyncConflictResolution,
      outcome: record.outcome,
      occurredAt: record.occurredAt.toISOString(),
      resolvedBy: record.resolvedBy,
    }));

    return { data, pagination: { cursor: nextCursor, hasMore } };
  }

  async resolveConflict(
    conflictId: string,
    input: ResolveZenhubSyncConflictDto,
    adminId: string,
    correlationId?: string,
  ): Promise<ZenhubSyncConflictEntry> {
    const conflict = await this.prisma.zenhubSyncConflict.findUnique({
      where: { id: conflictId },
    });

    if (!conflict) {
      throw new ConflictResolutionError(
        'ZENHUB_SYNC_CONFLICT_NOT_FOUND',
        'Sync conflict not found',
      );
    }

    if (conflict.resolution !== 'pending') {
      throw new ConflictResolutionError(
        'ZENHUB_SYNC_CONFLICT_ALREADY_RESOLVED',
        'Sync conflict is already resolved',
      );
    }

    let appliedStatus: string | null = null;
    let outcomeDescription: string;

    // Parse the existing conflict detail for context
    let detail: ZenhubSyncConflictDetail | null = null;
    if (conflict.outcome) {
      try {
        detail = JSON.parse(conflict.outcome) as ZenhubSyncConflictDetail;
      } catch {
        // outcome may not be valid JSON; proceed without detail
      }
    }

    if (input.action === 'apply-status') {
      const statusToApply = input.applyStatus ?? detail?.zenhubMappedStatus;
      if (!statusToApply) {
        throw new ConflictResolutionError(
          'VALIDATION_ERROR',
          'applyStatus is required when no mapped status exists',
        );
      }

      // Find and update the task
      const task = await this.prisma.task.findUnique({
        where: { id: conflict.affectedEntityId },
        select: { id: true, status: true },
      });

      if (task) {
        const previousStatus = task.status;
        const updateData: Record<string, unknown> = { status: statusToApply };

        // Replicate side-effects
        if (statusToApply === 'COMPLETED') {
          updateData.completedAt = new Date();
        } else if (previousStatus === 'COMPLETED') {
          updateData.completedAt = null;
        }

        await this.prisma.task.update({
          where: { id: task.id },
          data: updateData,
        });

        // Emit task.status-changed event
        this.eventEmitter.emit('task.status-changed', {
          eventType: 'task.status-changed',
          timestamp: new Date().toISOString(),
          correlationId: correlationId ?? '',
          actorId: adminId,
          payload: {
            taskId: task.id,
            previousStatus,
            newStatus: statusToApply,
          },
        });

        appliedStatus = statusToApply;
        outcomeDescription = `Admin applied status ${statusToApply} (was ${previousStatus})`;
      } else {
        outcomeDescription = `Task ${conflict.affectedEntityId} not found, marked as resolved`;
      }
    } else {
      // keep-edin: no task change
      outcomeDescription = `Admin kept Edin state (${detail?.edinStatus ?? 'unknown'})`;
    }

    // Update conflict record
    const updatedOutcome = detail
      ? JSON.stringify({ ...detail, appliedStatus, manualAction: input.action })
      : outcomeDescription;

    const updated = await this.prisma.zenhubSyncConflict.update({
      where: { id: conflictId },
      data: {
        resolution: 'manual-resolved',
        resolvedBy: adminId,
        outcome: updatedOutcome,
      },
    });

    // Emit resolution event
    const resolvedEvent: ZenhubSyncConflictResolvedEvent = {
      eventType: 'sprint.sync.conflict.resolved',
      timestamp: new Date().toISOString(),
      correlationId: correlationId ?? '',
      payload: {
        conflictId,
        resolution: 'manual-resolved',
        action: input.action,
        appliedStatus,
        taskId: conflict.affectedEntityId,
        adminId,
      },
    };
    this.eventEmitter.emit('sprint.sync.conflict.resolved', resolvedEvent);

    this.logger.log('Sync conflict resolved manually', {
      conflictId,
      action: input.action,
      appliedStatus,
      adminId,
      correlationId,
    });

    return {
      id: updated.id,
      syncId: updated.syncId,
      conflictType: updated.conflictType,
      affectedEntity: updated.affectedEntity,
      affectedEntityId: updated.affectedEntityId,
      resolution: updated.resolution as ZenhubSyncConflictResolution,
      outcome: updated.outcome,
      occurredAt: updated.occurredAt.toISOString(),
      resolvedBy: updated.resolvedBy,
    };
  }

  private async createAlert(
    type: 'ZENHUB_WEBHOOK_FAILURE_RATE' | 'ZENHUB_POLLING_TIMEOUT',
    severity: AlertSeverity,
    threshold: number,
    currentValue: number,
    now: Date,
    message: string,
  ): Promise<SystemAlert> {
    const hourBucket = Math.floor(now.getTime() / (60 * 60 * 1000));
    const id = createHash('sha256').update(`${type}:${hourBucket}`).digest('hex').slice(0, 16);

    const dismissKey = `${DISMISS_PREFIX}:${id}`;
    const isDismissed = await this.redis.get(dismissKey);

    return {
      id,
      type,
      severity,
      threshold,
      currentValue: Math.round(currentValue * 10) / 10,
      message,
      occurredAt: now.toISOString(),
      dismissed: !!isDismissed,
    };
  }
}

export class ConflictResolutionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ConflictResolutionError';
  }
}

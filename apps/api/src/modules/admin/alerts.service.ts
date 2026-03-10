import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import type { SystemAlert, AlertType, AlertSeverity } from '@edin/shared';
import { createHash } from 'crypto';

const DISMISS_PREFIX = 'admin:alert:dismissed';
const DISMISS_TTL_SECONDS = 86400; // 24 hours

interface AlertThreshold {
  type: AlertType;
  warningThreshold: number;
  criticalThreshold: number;
  unit: string;
  messageTemplate: (value: number, threshold: number) => string;
}

const ALERT_THRESHOLDS: AlertThreshold[] = [
  {
    type: 'API_ERROR_RATE',
    warningThreshold: 1,
    criticalThreshold: 5,
    unit: '%',
    messageTemplate: (value, threshold) =>
      `API error rate is ${value.toFixed(1)}% (threshold: ${threshold}%). Check failed evaluations and service health.`,
  },
  {
    type: 'INGESTION_FAILURE',
    warningThreshold: 3,
    criticalThreshold: 10,
    unit: 'failed jobs',
    messageTemplate: (value, threshold) =>
      `${value} failed ingestion jobs detected (threshold: ${threshold}). Check webhook delivery and GitHub integration.`,
  },
  {
    type: 'EVALUATION_THROUGHPUT',
    warningThreshold: 50,
    criticalThreshold: 80,
    unit: '% drop',
    messageTemplate: (value, threshold) =>
      `Evaluation throughput dropped ${value.toFixed(0)}% (threshold: ${threshold}%). Check AI evaluation service and queue health.`,
  },
];

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getActiveAlerts(): Promise<SystemAlert[]> {
    const alerts: SystemAlert[] = [];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Check API error rate (using evaluation failures as proxy)
    const [totalEvals, failedEvals] = await Promise.all([
      this.prisma.evaluation.count({ where: { createdAt: { gte: oneHourAgo } } }),
      this.prisma.evaluation.count({ where: { status: 'FAILED', createdAt: { gte: oneHourAgo } } }),
    ]);

    if (totalEvals > 0) {
      const errorRate = (failedEvals / totalEvals) * 100;
      const apiThreshold = ALERT_THRESHOLDS.find((t) => t.type === 'API_ERROR_RATE')!;
      if (errorRate > apiThreshold.warningThreshold) {
        const severity: AlertSeverity =
          errorRate > apiThreshold.criticalThreshold ? 'CRITICAL' : 'WARNING';
        const threshold =
          severity === 'CRITICAL' ? apiThreshold.criticalThreshold : apiThreshold.warningThreshold;
        alerts.push(
          await this.createAlert(
            'API_ERROR_RATE',
            severity,
            threshold,
            errorRate,
            now,
            apiThreshold.messageTemplate,
          ),
        );
      }
    }

    // Check ingestion failures (webhook deliveries with FAILED status in last 24h)
    const failedWebhooks = await this.prisma.webhookDelivery.count({
      where: { status: 'FAILED', createdAt: { gte: twentyFourHoursAgo } },
    });

    const ingestionThreshold = ALERT_THRESHOLDS.find((t) => t.type === 'INGESTION_FAILURE')!;
    if (failedWebhooks >= ingestionThreshold.warningThreshold) {
      const severity: AlertSeverity =
        failedWebhooks >= ingestionThreshold.criticalThreshold ? 'CRITICAL' : 'WARNING';
      const threshold =
        severity === 'CRITICAL'
          ? ingestionThreshold.criticalThreshold
          : ingestionThreshold.warningThreshold;
      alerts.push(
        await this.createAlert(
          'INGESTION_FAILURE',
          severity,
          threshold,
          failedWebhooks,
          now,
          ingestionThreshold.messageTemplate,
        ),
      );
    }

    // Check evaluation throughput drop
    const [currentHourEvals, prevDayAvgEvals] = await Promise.all([
      this.prisma.evaluation.count({
        where: { status: 'COMPLETED', completedAt: { gte: oneHourAgo } },
      }),
      this.prisma.evaluation.count({
        where: { status: 'COMPLETED', completedAt: { gte: twentyFourHoursAgo, lt: oneHourAgo } },
      }),
    ]);

    const avgHourlyEvals = prevDayAvgEvals / 23; // 23 hours in the preceding period
    if (avgHourlyEvals > 0) {
      const throughputDrop = ((avgHourlyEvals - currentHourEvals) / avgHourlyEvals) * 100;
      const evalThreshold = ALERT_THRESHOLDS.find((t) => t.type === 'EVALUATION_THROUGHPUT')!;
      if (throughputDrop > evalThreshold.warningThreshold) {
        const severity: AlertSeverity =
          throughputDrop > evalThreshold.criticalThreshold ? 'CRITICAL' : 'WARNING';
        const threshold =
          severity === 'CRITICAL'
            ? evalThreshold.criticalThreshold
            : evalThreshold.warningThreshold;
        alerts.push(
          await this.createAlert(
            'EVALUATION_THROUGHPUT',
            severity,
            threshold,
            throughputDrop,
            now,
            evalThreshold.messageTemplate,
          ),
        );
      }
    }

    return alerts;
  }

  async dismissAlert(alertId: string): Promise<boolean> {
    // We accept any alert ID — the frontend generates them deterministically
    const key = `${DISMISS_PREFIX}:${alertId}`;
    await this.redis.set(key, { dismissed: true }, DISMISS_TTL_SECONDS);
    this.logger.log(`Alert dismissed: ${alertId}`);
    return true;
  }

  private async createAlert(
    type: AlertType,
    severity: AlertSeverity,
    threshold: number,
    currentValue: number,
    now: Date,
    messageTemplate: (value: number, threshold: number) => string,
  ): Promise<SystemAlert> {
    // Deterministic ID based on type and hour bucket
    const hourBucket = Math.floor(now.getTime() / (60 * 60 * 1000));
    const id = createHash('sha256').update(`${type}:${hourBucket}`).digest('hex').slice(0, 16);

    // Check if dismissed
    const dismissKey = `${DISMISS_PREFIX}:${id}`;
    const isDismissed = await this.redis.get(dismissKey);

    return {
      id,
      type,
      severity,
      threshold,
      currentValue: Math.round(currentValue * 10) / 10,
      message: messageTemplate(currentValue, threshold),
      occurredAt: now.toISOString(),
      dismissed: !!isDismissed,
    };
  }
}

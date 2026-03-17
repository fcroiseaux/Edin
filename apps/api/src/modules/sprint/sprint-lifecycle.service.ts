import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import type {
  ZenhubPollCompletedEvent,
  SprintActivityPayload,
  SprintNotificationEvent,
} from '@edin/shared';

const KNOWN_STATES_KEY = 'sprint.known_states';
const MILESTONE_THRESHOLDS_KEY = 'sprint.velocity_milestone_thresholds';
const DEFAULT_MILESTONE_THRESHOLDS = [50, 75, 100];
const DEADLINE_NOTIFICATION_HOURS_KEY = 'sprint.deadline_notification_hours';
const DEFAULT_DEADLINE_NOTIFICATION_HOURS = 48;
const VELOCITY_DROP_THRESHOLD_KEY = 'sprint.velocity_drop_threshold';
const DEFAULT_VELOCITY_DROP_THRESHOLD = 0.7;

interface KnownSprintStates {
  [sprintId: string]: {
    status: 'active' | 'completed';
    milestonesEmitted: number[];
    deadlineNotified?: boolean;
    velocityDropNotified?: boolean;
  };
}

@Injectable()
export class SprintLifecycleService {
  private readonly logger = new Logger(SprintLifecycleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: SettingsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @OnEvent('zenhub.poll.completed')
  async handlePollCompleted(event: ZenhubPollCompletedEvent): Promise<void> {
    const correlationId = event.correlationId;

    try {
      await this.detectSprintLifecycleEvents(correlationId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to detect sprint lifecycle events', {
        module: 'sprint-lifecycle',
        correlationId,
        error: message,
      });
    }
  }

  async detectSprintLifecycleEvents(correlationId: string): Promise<void> {
    const now = new Date();
    const knownStates = await this.loadKnownStates();
    const thresholds = await this.loadMilestoneThresholds();
    let statesChanged = false;

    const sprints = await this.prisma.sprintMetric.findMany({
      select: {
        id: true,
        sprintId: true,
        sprintName: true,
        sprintStart: true,
        sprintEnd: true,
        velocity: true,
        committedPoints: true,
        deliveredPoints: true,
      },
    });

    for (const sprint of sprints) {
      const sprintId = sprint.sprintId;
      const isActive = sprint.sprintStart <= now && now < sprint.sprintEnd;
      const isCompleted = sprint.sprintEnd <= now;
      const known = knownStates[sprintId];

      // Detect sprint started
      if (isActive && (!known || known.status !== 'active')) {
        const payload: SprintActivityPayload = {
          eventType: 'sprint.lifecycle.started',
          timestamp: new Date().toISOString(),
          correlationId,
          payload: {
            sprintId,
            sprintName: sprint.sprintName,
            committedPoints: sprint.committedPoints,
          },
        };
        this.eventEmitter.emit('sprint.lifecycle.started', payload);

        this.logger.log('Sprint started event emitted', {
          module: 'sprint-lifecycle',
          sprintId,
          sprintName: sprint.sprintName,
          correlationId,
        });

        knownStates[sprintId] = { status: 'active', milestonesEmitted: [] };
        statesChanged = true;
      }

      // Detect sprint completed
      if (isCompleted && known?.status === 'active') {
        const payload: SprintActivityPayload = {
          eventType: 'sprint.lifecycle.completed',
          timestamp: new Date().toISOString(),
          correlationId,
          payload: {
            sprintId,
            sprintName: sprint.sprintName,
            velocity: sprint.velocity,
            committedPoints: sprint.committedPoints,
            deliveredPoints: sprint.deliveredPoints,
          },
        };
        this.eventEmitter.emit('sprint.lifecycle.completed', payload);

        this.logger.log('Sprint completed event emitted', {
          module: 'sprint-lifecycle',
          sprintId,
          sprintName: sprint.sprintName,
          velocity: sprint.velocity,
          correlationId,
        });

        knownStates[sprintId] = { status: 'completed', milestonesEmitted: known.milestonesEmitted };
        statesChanged = true;
      }

      // Detect velocity milestones for active sprints
      if (isActive && sprint.committedPoints > 0) {
        const currentKnown = knownStates[sprintId];
        const emittedMilestones = currentKnown?.milestonesEmitted ?? [];
        const deliveryPercentage = Math.round(
          (sprint.deliveredPoints / sprint.committedPoints) * 100,
        );

        for (const threshold of thresholds) {
          if (deliveryPercentage >= threshold && !emittedMilestones.includes(threshold)) {
            const payload: SprintActivityPayload = {
              eventType: 'sprint.velocity.milestone',
              timestamp: new Date().toISOString(),
              correlationId,
              payload: {
                sprintId,
                sprintName: sprint.sprintName,
                velocity: sprint.velocity,
                committedPoints: sprint.committedPoints,
                deliveredPoints: sprint.deliveredPoints,
                milestonePercentage: threshold,
              },
            };
            this.eventEmitter.emit('sprint.velocity.milestone', payload);

            this.logger.log('Sprint velocity milestone event emitted', {
              module: 'sprint-lifecycle',
              sprintId,
              sprintName: sprint.sprintName,
              milestone: `${threshold}%`,
              correlationId,
            });

            emittedMilestones.push(threshold);
            statesChanged = true;
          }
        }

        if (currentKnown) {
          currentKnown.milestonesEmitted = emittedMilestones;
        }
      }
    }

    // Detect deadline approaching for active sprints
    const deadlineHours = await this.loadDeadlineNotificationHours();
    const velocityDropThreshold = await this.loadVelocityDropThreshold();

    for (const sprint of sprints) {
      const sprintId = sprint.sprintId;
      const isActive = sprint.sprintStart <= now && now < sprint.sprintEnd;
      const currentKnown = knownStates[sprintId];

      if (!isActive || !currentKnown || currentKnown.status !== 'active') continue;

      // Deadline approaching
      const hoursRemaining = (sprint.sprintEnd.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (hoursRemaining <= deadlineHours && !currentKnown.deadlineNotified) {
        const payload: SprintNotificationEvent = {
          eventType: 'sprint.notification.deadline',
          timestamp: new Date().toISOString(),
          correlationId,
          payload: {
            sprintId,
            sprintName: sprint.sprintName,
            hoursRemaining: Math.round(hoursRemaining),
            committedPoints: sprint.committedPoints,
            deliveredPoints: sprint.deliveredPoints,
          },
        };
        this.eventEmitter.emit('sprint.notification.deadline', payload);

        this.logger.log('Sprint deadline notification emitted', {
          module: 'sprint-lifecycle',
          sprintId,
          sprintName: sprint.sprintName,
          hoursRemaining: Math.round(hoursRemaining),
          correlationId,
        });

        currentKnown.deadlineNotified = true;
        statesChanged = true;
      }

      // Velocity drop detection (only after >50% of sprint elapsed)
      const totalDuration = sprint.sprintEnd.getTime() - sprint.sprintStart.getTime();
      const elapsed = now.getTime() - sprint.sprintStart.getTime();
      const elapsedRatio = totalDuration > 0 ? elapsed / totalDuration : 0;

      if (elapsedRatio > 0.5 && sprint.committedPoints > 0 && !currentKnown.velocityDropNotified) {
        const deliveryRatio = sprint.deliveredPoints / sprint.committedPoints;
        if (deliveryRatio < velocityDropThreshold) {
          const deliveryPercentage = Math.round(deliveryRatio * 100);
          const payload: SprintNotificationEvent = {
            eventType: 'sprint.notification.velocity_drop',
            timestamp: new Date().toISOString(),
            correlationId,
            payload: {
              sprintId,
              sprintName: sprint.sprintName,
              committedPoints: sprint.committedPoints,
              deliveredPoints: sprint.deliveredPoints,
              deliveryPercentage,
            },
          };
          this.eventEmitter.emit('sprint.notification.velocity_drop', payload);

          this.logger.log('Sprint velocity drop notification emitted', {
            module: 'sprint-lifecycle',
            sprintId,
            sprintName: sprint.sprintName,
            deliveryPercentage,
            correlationId,
          });

          currentKnown.velocityDropNotified = true;
          statesChanged = true;
        }
      }
    }

    if (statesChanged) {
      await this.saveKnownStates(knownStates);
    }
  }

  private async loadKnownStates(): Promise<KnownSprintStates> {
    const raw = await this.settingsService.getSettingValue<string | null>(KNOWN_STATES_KEY, null);
    if (!raw) return {};
    try {
      return JSON.parse(raw) as KnownSprintStates;
    } catch {
      return {};
    }
  }

  private async saveKnownStates(states: KnownSprintStates): Promise<void> {
    const adminId = await this.resolveAdminId();
    await this.settingsService.updateSetting(
      KNOWN_STATES_KEY,
      JSON.stringify(states),
      adminId,
      undefined,
      { redactAudit: true },
    );
  }

  private async resolveAdminId(): Promise<string> {
    const admin = await this.prisma.contributor.findFirst({
      where: { role: 'ADMIN' as never },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });
    return admin?.id ?? 'system';
  }

  private async loadDeadlineNotificationHours(): Promise<number> {
    const raw = await this.settingsService.getSettingValue<number | null>(
      DEADLINE_NOTIFICATION_HOURS_KEY,
      null,
    );
    if (typeof raw === 'number' && raw > 0) return raw;
    return DEFAULT_DEADLINE_NOTIFICATION_HOURS;
  }

  private async loadVelocityDropThreshold(): Promise<number> {
    const raw = await this.settingsService.getSettingValue<number | null>(
      VELOCITY_DROP_THRESHOLD_KEY,
      null,
    );
    if (typeof raw === 'number' && raw > 0 && raw <= 1) return raw;
    return DEFAULT_VELOCITY_DROP_THRESHOLD;
  }

  private async loadMilestoneThresholds(): Promise<number[]> {
    const raw = await this.settingsService.getSettingValue<string | null>(
      MILESTONE_THRESHOLDS_KEY,
      null,
    );
    if (!raw) return DEFAULT_MILESTONE_THRESHOLDS;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every((n: unknown) => typeof n === 'number')) {
        return parsed;
      }
      return DEFAULT_MILESTONE_THRESHOLDS;
    } catch {
      return DEFAULT_MILESTONE_THRESHOLDS;
    }
  }
}

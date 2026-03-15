import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ERROR_CODES } from '@edin/shared';
import type {
  ZenhubWebhookReceivedEvent,
  ZenhubPollCompletedEvent,
  BurndownDataPoint,
  SprintMetricCalculatedEvent,
  ScopeChangeEvent,
  EstimationAccuracyCalculatedEvent,
  ContributorEstimationData,
} from '@edin/shared';
import type {
  VelocityDataPoint,
  SprintMetricDetail,
  SprintMetricSummary,
  ScopeChangeRecord,
  ContributorAccuracyTrend,
  CombinedContributorMetric,
  PersonalSprintMetrics,
} from '@edin/shared';
import PDFDocument from 'pdfkit';
import type {
  SprintMetric,
  PipelineTransition,
  ScopeChange,
  ContributorSprintEstimation,
} from '../../../generated/prisma/client/client.js';

@Injectable()
export class SprintMetricsService {
  private readonly logger = new Logger(SprintMetricsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Upsert a sprint metric record by [sprintId, domain] unique constraint.
   */
  async upsertSprintMetric(data: {
    sprintId: string;
    sprintName: string;
    sprintStart: Date;
    sprintEnd: Date;
    domain?: string;
  }): Promise<SprintMetric> {
    const domain = data.domain ?? null;

    return this.prisma.sprintMetric.upsert({
      where: {
        sprintId_domain: {
          sprintId: data.sprintId,
          domain: domain as string,
        },
      },
      update: {
        sprintName: data.sprintName,
        sprintStart: data.sprintStart,
        sprintEnd: data.sprintEnd,
      },
      create: {
        sprintId: data.sprintId,
        sprintName: data.sprintName,
        sprintStart: data.sprintStart,
        sprintEnd: data.sprintEnd,
        domain,
      },
    });
  }

  /**
   * Record a raw pipeline transition event linked to a sprint metric.
   */
  async recordPipelineTransition(data: {
    sprintId: string;
    issueId: string;
    issueNumber: number;
    fromPipeline: string;
    toPipeline: string;
    storyPoints?: number;
    contributorId?: string;
    transitionedAt: Date;
  }): Promise<PipelineTransition> {
    // Ensure the sprint metric exists first
    const metric = await this.prisma.sprintMetric.findFirst({
      where: { sprintId: data.sprintId, domain: null },
    });

    if (!metric) {
      this.logger.warn('No sprint metric found for transition, skipping', {
        sprintId: data.sprintId,
        issueId: data.issueId,
      });
      throw new DomainException(
        ERROR_CODES.SPRINT_METRIC_CALCULATION_FAILED,
        `No sprint metric found for sprint ${data.sprintId}`,
      );
    }

    return this.prisma.pipelineTransition.create({
      data: {
        sprintMetricId: metric.id,
        issueId: data.issueId,
        issueNumber: data.issueNumber,
        fromPipeline: data.fromPipeline,
        toPipeline: data.toPipeline,
        storyPoints: data.storyPoints ?? null,
        contributorId: data.contributorId ?? null,
        transitionedAt: data.transitionedAt,
      },
    });
  }

  /**
   * Calculate velocity: total story points of issues moved to "Done" during a sprint.
   * Calculates from raw pipeline_transitions only (architecture rule).
   */
  async calculateVelocity(sprintId: string, domain?: string): Promise<number> {
    try {
      const metric = await this.findSprintMetric(sprintId, domain);
      if (!metric) return 0;

      // Get all transitions to "Done" for this sprint metric
      const doneTransitions = await this.prisma.pipelineTransition.findMany({
        where: {
          sprintMetricId: metric.id,
          toPipeline: 'Done',
        },
      });

      // Sum story points — deduplicate by issueId (only count latest transition per issue)
      const issuePoints = new Map<string, number>();
      for (const transition of doneTransitions) {
        issuePoints.set(transition.issueId, transition.storyPoints ?? 0);
      }

      const velocity = Array.from(issuePoints.values()).reduce((sum, pts) => sum + pts, 0);

      // Upsert the calculated velocity
      await this.prisma.sprintMetric.update({
        where: { id: metric.id },
        data: { velocity, deliveredPoints: velocity },
      });

      // Emit event
      const event: SprintMetricCalculatedEvent = {
        eventType: 'sprint.velocity.calculated',
        timestamp: new Date().toISOString(),
        correlationId: `velocity-${sprintId}-${Date.now()}`,
        payload: {
          sprintId,
          sprintName: metric.sprintName,
          metricType: 'velocity',
          value: velocity,
          domain: domain ?? undefined,
        },
      };
      this.eventEmitter.emit('sprint.velocity.calculated', event);

      this.logger.log({
        msg: 'Velocity calculated',
        sprintId,
        velocity,
        domain: domain ?? 'all',
      });

      return velocity;
    } catch (error) {
      if (error instanceof DomainException) throw error;
      this.logger.error('Velocity calculation failed', {
        sprintId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DomainException(
        ERROR_CODES.SPRINT_METRIC_CALCULATION_FAILED,
        `Failed to calculate velocity for sprint ${sprintId}`,
      );
    }
  }

  /**
   * Calculate burndown: daily time-series of remaining story points.
   * Calculates from raw pipeline_transitions only.
   */
  async calculateBurndown(sprintId: string, domain?: string): Promise<BurndownDataPoint[]> {
    try {
      const metric = await this.findSprintMetric(sprintId, domain);
      if (!metric) return [];

      const transitions = await this.prisma.pipelineTransition.findMany({
        where: { sprintMetricId: metric.id },
        orderBy: { transitionedAt: 'asc' },
      });

      const sprintStart = metric.sprintStart;
      const sprintEnd = metric.sprintEnd;
      const committedPoints = metric.committedPoints;
      const totalDays = Math.max(
        1,
        Math.ceil((sprintEnd.getTime() - sprintStart.getTime()) / (1000 * 60 * 60 * 24)),
      );

      // Build daily burndown
      const burndownData: BurndownDataPoint[] = [];
      let remainingPoints = committedPoints;

      for (let day = 0; day <= totalDays; day++) {
        const currentDate = new Date(sprintStart);
        currentDate.setDate(currentDate.getDate() + day);
        const dateStr = currentDate.toISOString().split('T')[0];

        // Subtract points for issues completed on or before this day
        const dayEnd = new Date(currentDate);
        dayEnd.setHours(23, 59, 59, 999);

        const completedOnDay = transitions.filter((t) => {
          const tDate = new Date(t.transitionedAt);
          const tDateStr = tDate.toISOString().split('T')[0];
          return tDateStr === dateStr && t.toPipeline === 'Done';
        });

        for (const t of completedOnDay) {
          remainingPoints -= t.storyPoints ?? 0;
        }

        const idealPoints = Math.max(0, committedPoints - (committedPoints / totalDays) * day);

        burndownData.push({
          date: dateStr,
          remainingPoints: Math.max(0, remainingPoints),
          idealPoints: Math.round(idealPoints * 100) / 100,
        });
      }

      // Store as JSONB
      await this.prisma.sprintMetric.update({
        where: { id: metric.id },
        data: { burndownData: burndownData as unknown as never },
      });

      this.logger.log({
        msg: 'Burndown calculated',
        sprintId,
        dataPoints: burndownData.length,
        domain: domain ?? 'all',
      });

      return burndownData;
    } catch (error) {
      if (error instanceof DomainException) throw error;
      this.logger.error('Burndown calculation failed', {
        sprintId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DomainException(
        ERROR_CODES.SPRINT_METRIC_CALCULATION_FAILED,
        `Failed to calculate burndown for sprint ${sprintId}`,
      );
    }
  }

  /**
   * Calculate cycle time: average time (in days) from "In Progress" to "Done" per issue.
   * Calculates from raw pipeline_transitions only.
   */
  async calculateCycleTime(sprintId: string, domain?: string): Promise<number | null> {
    try {
      const metric = await this.findSprintMetric(sprintId, domain);
      if (!metric) return null;

      const transitions = await this.prisma.pipelineTransition.findMany({
        where: { sprintMetricId: metric.id },
        orderBy: { transitionedAt: 'asc' },
      });

      // Group transitions by issueId
      const issueTransitions = new Map<string, typeof transitions>();
      for (const t of transitions) {
        const existing = issueTransitions.get(t.issueId) ?? [];
        existing.push(t);
        issueTransitions.set(t.issueId, existing);
      }

      // Calculate cycle time per issue
      const cycleTimes: number[] = [];
      for (const [, issueTrans] of issueTransitions) {
        const inProgress = issueTrans.find((t) => t.toPipeline === 'In Progress');
        const done = issueTrans.find((t) => t.toPipeline === 'Done');

        if (inProgress && done) {
          const diffMs = done.transitionedAt.getTime() - inProgress.transitionedAt.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (diffDays >= 0) {
            cycleTimes.push(diffDays);
          }
        }
      }

      const cycleTimeAvg =
        cycleTimes.length > 0
          ? Math.round((cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length) * 100) / 100
          : null;

      await this.prisma.sprintMetric.update({
        where: { id: metric.id },
        data: { cycleTimeAvg },
      });

      this.logger.log({
        msg: 'Cycle time calculated',
        sprintId,
        cycleTimeAvg,
        issueCount: cycleTimes.length,
        domain: domain ?? 'all',
      });

      return cycleTimeAvg;
    } catch (error) {
      if (error instanceof DomainException) throw error;
      this.logger.error('Cycle time calculation failed', {
        sprintId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DomainException(
        ERROR_CODES.SPRINT_METRIC_CALCULATION_FAILED,
        `Failed to calculate cycle time for sprint ${sprintId}`,
      );
    }
  }

  /**
   * Calculate lead time: average time (in days) from first transition to "Done" per issue.
   * Calculates from raw pipeline_transitions only.
   */
  async calculateLeadTime(sprintId: string, domain?: string): Promise<number | null> {
    try {
      const metric = await this.findSprintMetric(sprintId, domain);
      if (!metric) return null;

      const transitions = await this.prisma.pipelineTransition.findMany({
        where: { sprintMetricId: metric.id },
        orderBy: { transitionedAt: 'asc' },
      });

      // Group transitions by issueId
      const issueTransitions = new Map<string, typeof transitions>();
      for (const t of transitions) {
        const existing = issueTransitions.get(t.issueId) ?? [];
        existing.push(t);
        issueTransitions.set(t.issueId, existing);
      }

      // Calculate lead time per issue (first transition to Done)
      const leadTimes: number[] = [];
      for (const [, issueTrans] of issueTransitions) {
        const firstTransition = issueTrans[0]; // Already sorted by transitionedAt asc
        const done = issueTrans.find((t) => t.toPipeline === 'Done');

        if (firstTransition && done) {
          const diffMs = done.transitionedAt.getTime() - firstTransition.transitionedAt.getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (diffDays >= 0) {
            leadTimes.push(diffDays);
          }
        }
      }

      const leadTimeAvg =
        leadTimes.length > 0
          ? Math.round((leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length) * 100) / 100
          : null;

      await this.prisma.sprintMetric.update({
        where: { id: metric.id },
        data: { leadTimeAvg },
      });

      this.logger.log({
        msg: 'Lead time calculated',
        sprintId,
        leadTimeAvg,
        issueCount: leadTimes.length,
        domain: domain ?? 'all',
      });

      return leadTimeAvg;
    } catch (error) {
      if (error instanceof DomainException) throw error;
      this.logger.error('Lead time calculation failed', {
        sprintId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DomainException(
        ERROR_CODES.SPRINT_METRIC_CALCULATION_FAILED,
        `Failed to calculate lead time for sprint ${sprintId}`,
      );
    }
  }

  /**
   * Record a scope change event (issue added/removed from sprint).
   * Updates the scope_changes count on the sprint metric.
   */
  async recordScopeChange(data: {
    sprintId: string;
    issueId: string;
    issueNumber: number;
    changeType: 'ADDED' | 'REMOVED';
    storyPoints?: number;
    changedAt: Date;
  }): Promise<ScopeChange> {
    const metric = await this.prisma.sprintMetric.findFirst({
      where: { sprintId: data.sprintId, domain: null },
    });

    if (!metric) {
      this.logger.warn('No sprint metric found for scope change', {
        sprintId: data.sprintId,
        issueId: data.issueId,
      });
      throw new DomainException(
        ERROR_CODES.SPRINT_METRIC_CALCULATION_FAILED,
        `No sprint metric found for sprint ${data.sprintId}`,
      );
    }

    const scopeChange = await this.prisma.scopeChange.create({
      data: {
        sprintMetricId: metric.id,
        issueId: data.issueId,
        issueNumber: data.issueNumber,
        changeType: data.changeType,
        storyPoints: data.storyPoints ?? null,
        changedAt: data.changedAt,
      },
    });

    // Scope change count is updated by calculateScopeChanges() during recalculateAllMetrics()
    // to avoid race conditions on concurrent webhook deliveries.

    // Emit event
    const event: ScopeChangeEvent = {
      eventType: 'sprint.scope.changed',
      timestamp: new Date().toISOString(),
      correlationId: `scope-${data.sprintId}-${Date.now()}`,
      payload: {
        sprintId: data.sprintId,
        issueId: data.issueId,
        changeType: data.changeType,
        storyPoints: data.storyPoints ?? null,
      },
    };
    this.eventEmitter.emit('sprint.scope.changed', event);

    this.logger.log({
      msg: 'Scope change recorded',
      sprintId: data.sprintId,
      issueId: data.issueId,
      changeType: data.changeType,
    });

    return scopeChange;
  }

  /**
   * Calculate scope changes count from raw scope_changes records.
   * Idempotent — counts from raw data.
   */
  async calculateScopeChanges(sprintId: string, domain?: string): Promise<number> {
    try {
      const metric = await this.findSprintMetric(sprintId, domain);
      if (!metric) return 0;

      const count = await this.prisma.scopeChange.count({
        where: { sprintMetricId: metric.id },
      });

      await this.prisma.sprintMetric.update({
        where: { id: metric.id },
        data: { scopeChanges: count },
      });

      this.logger.log({
        msg: 'Scope changes calculated',
        sprintId,
        scopeChanges: count,
        domain: domain ?? 'all',
      });

      return count;
    } catch (error) {
      if (error instanceof DomainException) throw error;
      this.logger.error('Scope changes calculation failed', {
        sprintId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DomainException(
        ERROR_CODES.SPRINT_METRIC_CALCULATION_FAILED,
        `Failed to calculate scope changes for sprint ${sprintId}`,
      );
    }
  }

  /**
   * Calculate estimation accuracy: planned vs delivered story points per contributor.
   * Stores per-contributor data in ContributorSprintEstimation and overall accuracy in SprintMetric.
   * Calculates from raw pipeline_transitions only (architecture rule).
   */
  async calculateEstimationAccuracy(sprintId: string, domain?: string): Promise<number | null> {
    try {
      const metric = await this.findSprintMetric(sprintId, domain);
      if (!metric) return null;

      const transitions = await this.prisma.pipelineTransition.findMany({
        where: { sprintMetricId: metric.id },
        orderBy: { transitionedAt: 'asc' },
      });

      // Build per-contributor planned and delivered points from raw transitions
      const contributorPlanned = new Map<string, Map<string, number>>(); // contributorId → Map<issueId, points>
      const contributorDelivered = new Map<string, Map<string, number>>(); // contributorId → Map<issueId, points>

      for (const t of transitions) {
        if (!t.contributorId) continue;

        // Track planned: all issues assigned to a contributor (latest estimate wins per issue)
        if (!contributorPlanned.has(t.contributorId)) {
          contributorPlanned.set(t.contributorId, new Map());
        }
        if (t.storyPoints != null) {
          contributorPlanned.get(t.contributorId)!.set(t.issueId, t.storyPoints);
        }

        // Track delivered: issues moved to Done by a contributor
        if (t.toPipeline === 'Done') {
          if (!contributorDelivered.has(t.contributorId)) {
            contributorDelivered.set(t.contributorId, new Map());
          }
          contributorDelivered.get(t.contributorId)!.set(t.issueId, t.storyPoints ?? 0);
        }
      }

      // Calculate per-contributor accuracy and upsert records
      const estimations: ContributorEstimationData[] = [];
      const allContributors = new Set([
        ...contributorPlanned.keys(),
        ...contributorDelivered.keys(),
      ]);

      for (const contributorId of allContributors) {
        const plannedIssues = contributorPlanned.get(contributorId) ?? new Map<string, number>();
        const deliveredIssues =
          contributorDelivered.get(contributorId) ?? new Map<string, number>();

        const plannedPoints = Array.from(plannedIssues.values()).reduce((sum, pts) => sum + pts, 0);
        const deliveredPoints = Array.from(deliveredIssues.values()).reduce(
          (sum, pts) => sum + pts,
          0,
        );

        const accuracy =
          plannedPoints > 0
            ? Math.round((deliveredPoints / plannedPoints) * 100 * 100) / 100
            : null;

        // Upsert per-contributor estimation record
        await this.prisma.contributorSprintEstimation.upsert({
          where: {
            sprintMetricId_contributorId: {
              sprintMetricId: metric.id,
              contributorId,
            },
          },
          update: { plannedPoints, deliveredPoints, accuracy },
          create: {
            sprintMetricId: metric.id,
            contributorId,
            plannedPoints,
            deliveredPoints,
            accuracy,
          },
        });

        estimations.push({ contributorId, plannedPoints, deliveredPoints, accuracy });
      }

      // Calculate overall accuracy (average of per-contributor accuracies, excluding null)
      const validAccuracies = estimations
        .map((e) => e.accuracy)
        .filter((a): a is number => a !== null);

      const overallAccuracy =
        validAccuracies.length > 0
          ? Math.round(
              (validAccuracies.reduce((sum, a) => sum + a, 0) / validAccuracies.length) * 100,
            ) / 100
          : null;

      await this.prisma.sprintMetric.update({
        where: { id: metric.id },
        data: { estimationAccuracy: overallAccuracy },
      });

      // Emit event
      const event: EstimationAccuracyCalculatedEvent = {
        eventType: 'sprint.estimation.calculated',
        timestamp: new Date().toISOString(),
        correlationId: `estimation-${sprintId}-${Date.now()}`,
        payload: {
          sprintId,
          sprintName: metric.sprintName,
          overallAccuracy,
          contributorCount: estimations.length,
          domain: domain ?? undefined,
        },
      };
      this.eventEmitter.emit('sprint.estimation.calculated', event);

      this.logger.log({
        msg: 'Estimation accuracy calculated',
        sprintId,
        overallAccuracy,
        contributorCount: estimations.length,
        domain: domain ?? 'all',
      });

      return overallAccuracy;
    } catch (error) {
      if (error instanceof DomainException) throw error;
      this.logger.error('Estimation accuracy calculation failed', {
        sprintId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new DomainException(
        ERROR_CODES.SPRINT_METRIC_CALCULATION_FAILED,
        `Failed to calculate estimation accuracy for sprint ${sprintId}`,
      );
    }
  }

  /**
   * Get per-contributor estimation data for a sprint.
   */
  async getContributorEstimations(
    sprintId: string,
    domain?: string,
  ): Promise<ContributorSprintEstimation[]> {
    const metric = await this.findSprintMetric(sprintId, domain);
    if (!metric) return [];

    return this.prisma.contributorSprintEstimation.findMany({
      where: { sprintMetricId: metric.id },
      orderBy: { contributorId: 'asc' },
    });
  }

  /**
   * Recalculate all metrics for a sprint. Idempotent — same input produces same output.
   */
  async recalculateAllMetrics(sprintId: string, domain?: string): Promise<SprintMetric> {
    this.logger.log({ msg: 'Recalculating all metrics', sprintId, domain: domain ?? 'all' });

    await this.calculateVelocity(sprintId, domain);
    await this.calculateBurndown(sprintId, domain);
    await this.calculateCycleTime(sprintId, domain);
    await this.calculateLeadTime(sprintId, domain);
    await this.calculateScopeChanges(sprintId, domain);
    await this.calculateEstimationAccuracy(sprintId, domain);

    const metric = await this.findSprintMetric(sprintId, domain);
    if (!metric) {
      throw new DomainException(
        ERROR_CODES.SPRINT_METRIC_CALCULATION_FAILED,
        `Sprint metric not found after recalculation for sprint ${sprintId}`,
      );
    }

    const event: SprintMetricCalculatedEvent = {
      eventType: 'sprint.metrics.recalculated',
      timestamp: new Date().toISOString(),
      correlationId: `recalc-${sprintId}-${Date.now()}`,
      payload: {
        sprintId,
        sprintName: metric.sprintName,
        metricType: 'all',
        value: metric.velocity,
        domain: domain ?? undefined,
      },
    };
    this.eventEmitter.emit('sprint.metrics.recalculated', event);

    this.logger.log({
      msg: 'All metrics recalculated',
      sprintId,
      velocity: metric.velocity,
      cycleTimeAvg: metric.cycleTimeAvg,
      leadTimeAvg: metric.leadTimeAvg,
      scopeChanges: metric.scopeChanges,
      estimationAccuracy: metric.estimationAccuracy,
    });

    return metric;
  }

  /**
   * Handle webhook events — route to appropriate handler based on event type.
   */
  @OnEvent('zenhub.webhook.received')
  async handleWebhookEvent(event: ZenhubWebhookReceivedEvent): Promise<void> {
    const { webhookEventType, syncId } = event.payload;
    const handledEventTypes = ['issue_moved', 'estimate_changed', 'issue_transferred'];

    if (!handledEventTypes.includes(webhookEventType)) {
      return;
    }

    this.logger.log({
      msg: 'Processing webhook event for sprint metrics',
      webhookEventType,
      syncId,
      correlationId: event.correlationId,
    });

    // Fetch the full sync record to get the payload
    const syncRecord = await this.prisma.zenhubSync.findUnique({
      where: { id: syncId },
    });

    if (!syncRecord?.payload) {
      this.logger.warn('Sync record not found or has no payload', { syncId });
      return;
    }

    const payload = syncRecord.payload as Record<string, unknown>;
    const sprintId = payload.sprint_id as string | undefined;

    if (!sprintId) {
      this.logger.debug('Webhook event has no sprint context, skipping', { syncId });
      return;
    }

    try {
      if (webhookEventType === 'issue_moved') {
        await this.recordPipelineTransition({
          sprintId,
          issueId: (payload.issue_id as string) ?? '',
          issueNumber: (payload.issue_number as number) ?? 0,
          fromPipeline: (payload.from_pipeline as string) ?? '',
          toPipeline: (payload.to_pipeline as string) ?? '',
          storyPoints: (payload.story_points as number) ?? undefined,
          contributorId: (payload.contributor_id as string) ?? undefined,
          transitionedAt: new Date(),
        });
        await this.recalculateAllMetrics(sprintId);
      } else if (webhookEventType === 'estimate_changed') {
        // Update story points on existing transitions for this issue
        await this.handleEstimateChanged(sprintId, payload);
        await this.recalculateAllMetrics(sprintId);
      } else if (webhookEventType === 'issue_transferred') {
        await this.handleIssueTransferred(sprintId, payload);
      }
    } catch (error) {
      this.logger.error('Failed to process webhook event for sprint metrics', {
        syncId,
        sprintId,
        webhookEventType,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Handle estimate_changed webhook — update story points on existing transitions.
   */
  private async handleEstimateChanged(
    sprintId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const issueId = (payload.issue_id as string) ?? '';
    const newEstimate = payload.new_estimate as number | undefined;

    if (!issueId || newEstimate == null) return;

    const metric = await this.findSprintMetric(sprintId);
    if (!metric) return;

    // Update story points on all transitions for this issue in this sprint
    await this.prisma.pipelineTransition.updateMany({
      where: {
        sprintMetricId: metric.id,
        issueId,
      },
      data: { storyPoints: newEstimate },
    });

    this.logger.log({
      msg: 'Estimate changed — updated pipeline transitions',
      sprintId,
      issueId,
      newEstimate,
    });
  }

  /**
   * Handle issue_transferred webhook — record as scope change.
   */
  private async handleIssueTransferred(
    sprintId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const issueId = (payload.issue_id as string) ?? '';
    const issueNumber = (payload.issue_number as number) ?? 0;
    const storyPoints = (payload.story_points as number) ?? undefined;
    const transferType = payload.transfer_type as string | undefined;

    // Determine change type: "in" means added to sprint, "out" means removed
    const changeType = transferType === 'out' ? ('REMOVED' as const) : ('ADDED' as const);

    await this.recordScopeChange({
      sprintId,
      issueId,
      issueNumber,
      changeType,
      storyPoints,
      changedAt: new Date(),
    });

    // Recalculate metrics after scope change
    await this.recalculateAllMetrics(sprintId);
  }

  /**
   * Handle poll completion — process bulk sprint data.
   */
  @OnEvent('zenhub.poll.completed')
  async handlePollCompleted(event: ZenhubPollCompletedEvent): Promise<void> {
    this.logger.log({
      msg: 'Processing poll completion for sprint metrics',
      syncId: event.payload.syncId,
      sprintCount: event.payload.sprintCount,
      issueCount: event.payload.issueCount,
      correlationId: event.correlationId,
    });

    // Fetch the sync record to get the full payload with sprint/issue data
    const syncRecord = await this.prisma.zenhubSync.findUnique({
      where: { id: event.payload.syncId },
    });

    if (!syncRecord?.payload) {
      this.logger.warn('Poll sync record has no payload data to process', {
        syncId: event.payload.syncId,
      });
      return;
    }

    const payload = syncRecord.payload as Record<string, unknown>;
    const sprints = (payload.sprints as Array<Record<string, unknown>>) ?? [];

    for (const sprint of sprints) {
      try {
        const sprintId = sprint.id as string;
        const sprintName = (sprint.name as string) ?? '';
        const startAt = sprint.startAt as string | undefined;
        const endAt = sprint.endAt as string | undefined;

        if (!sprintId || !startAt || !endAt) continue;

        await this.upsertSprintMetric({
          sprintId,
          sprintName,
          sprintStart: new Date(startAt),
          sprintEnd: new Date(endAt),
        });

        this.logger.log({
          msg: 'Sprint metric upserted from poll data',
          sprintId,
          sprintName,
          correlationId: event.correlationId,
        });
      } catch (error) {
        this.logger.error('Failed to upsert sprint metric from poll', {
          sprint,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Get velocity chart data: chart-ready array in chronological order.
   */
  async getVelocityChartData(options: {
    domain?: string;
    limit: number;
  }): Promise<VelocityDataPoint[]> {
    const metrics = await this.prisma.sprintMetric.findMany({
      where: { domain: options.domain ?? null },
      orderBy: { sprintEnd: 'desc' },
      take: options.limit,
      select: {
        sprintEnd: true,
        velocity: true,
        sprintName: true,
      },
    });

    // Reverse to chronological order (oldest first)
    return metrics.reverse().map((m) => ({
      x: m.sprintEnd.toISOString().split('T')[0],
      y: m.velocity,
      label: m.sprintName,
    }));
  }

  /**
   * Get burndown chart data for a specific sprint.
   */
  async getBurndownChartData(sprintId: string, domain?: string): Promise<BurndownDataPoint[]> {
    const metric = await this.findSprintMetric(sprintId, domain);
    if (!metric?.burndownData) return [];

    return metric.burndownData as unknown as BurndownDataPoint[];
  }

  /**
   * List sprint metrics with pagination (cursor-based).
   */
  async listSprints(options: { domain?: string; limit: number; cursor?: string }): Promise<{
    data: SprintMetricSummary[];
    pagination: { cursor: string | null; hasMore: boolean };
  }> {
    const take = options.limit + 1; // Fetch one extra for hasMore check

    const metrics = await this.prisma.sprintMetric.findMany({
      where: { domain: options.domain ?? null },
      orderBy: { sprintEnd: 'desc' },
      take,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
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

    const hasMore = metrics.length > options.limit;
    const data = hasMore ? metrics.slice(0, options.limit) : metrics;

    return {
      data: data.map((m) => ({
        id: m.id,
        sprintId: m.sprintId,
        sprintName: m.sprintName,
        sprintStart: m.sprintStart.toISOString(),
        sprintEnd: m.sprintEnd.toISOString(),
        velocity: m.velocity,
        committedPoints: m.committedPoints,
        deliveredPoints: m.deliveredPoints,
      })),
      pagination: {
        cursor: data.length > 0 ? data[data.length - 1].id : null,
        hasMore,
      },
    };
  }

  /**
   * Get a single sprint metric by its database ID (UUID).
   * Returns chart-ready typed DTO, not raw DB record.
   */
  async getSprintMetricById(id: string): Promise<SprintMetricDetail | null> {
    const metric = await this.prisma.sprintMetric.findUnique({ where: { id } });
    if (!metric) return null;

    return {
      id: metric.id,
      sprintId: metric.sprintId,
      sprintName: metric.sprintName,
      sprintStart: metric.sprintStart.toISOString(),
      sprintEnd: metric.sprintEnd.toISOString(),
      velocity: metric.velocity,
      committedPoints: metric.committedPoints,
      deliveredPoints: metric.deliveredPoints,
      cycleTimeAvg: metric.cycleTimeAvg,
      leadTimeAvg: metric.leadTimeAvg,
      scopeChanges: metric.scopeChanges,
      estimationAccuracy: metric.estimationAccuracy,
    };
  }

  /**
   * Get scope change history for a sprint metric (by database UUID).
   * Returns DTO array — never raw DB records.
   */
  async getScopeChangeHistory(
    sprintMetricId: string,
    options: { domain?: string; limit: number },
  ): Promise<ScopeChangeRecord[]> {
    const metric = await this.prisma.sprintMetric.findUnique({
      where: { id: sprintMetricId },
    });
    if (!metric) return [];

    // If domain filter is specified and doesn't match, return empty
    if (options.domain !== undefined && metric.domain !== options.domain) {
      return [];
    }

    const records = await this.prisma.scopeChange.findMany({
      where: { sprintMetricId: metric.id },
      orderBy: { changedAt: 'desc' },
      take: options.limit,
    });

    return records.map((r) => ({
      id: r.id,
      issueId: r.issueId,
      issueNumber: r.issueNumber,
      changeType: r.changeType as 'ADDED' | 'REMOVED',
      storyPoints: r.storyPoints,
      changedAt: r.changedAt.toISOString(),
    }));
  }

  /**
   * Get contributor estimation accuracy trends across sprints.
   * Returns per-contributor accuracy data grouped by sprint in chronological order.
   */
  async getContributorAccuracyTrends(options: {
    domain?: string;
    limit: number;
  }): Promise<ContributorAccuracyTrend[]> {
    // Get last N sprints ordered by sprintEnd desc
    const sprints = await this.prisma.sprintMetric.findMany({
      where: { domain: options.domain ?? null },
      orderBy: { sprintEnd: 'desc' },
      take: options.limit,
      select: {
        id: true,
        sprintId: true,
        sprintName: true,
        sprintEnd: true,
      },
    });

    if (sprints.length === 0) return [];

    // Reverse to chronological order (oldest first)
    const chronologicalSprints = [...sprints].reverse();
    const sprintMetricIds = chronologicalSprints.map((s) => s.id);

    // Fetch all contributor estimations for these sprints in one query
    const estimations = await this.prisma.contributorSprintEstimation.findMany({
      where: { sprintMetricId: { in: sprintMetricIds } },
      orderBy: { contributorId: 'asc' },
    });

    // Build sprint lookup
    const sprintLookup = new Map(chronologicalSprints.map((s) => [s.id, s]));

    // Group by contributor
    const contributorMap = new Map<string, ContributorAccuracyTrend['sprints']>();

    for (const est of estimations) {
      const sprint = sprintLookup.get(est.sprintMetricId);
      if (!sprint) continue;

      if (!contributorMap.has(est.contributorId)) {
        contributorMap.set(est.contributorId, []);
      }

      contributorMap.get(est.contributorId)!.push({
        sprintId: sprint.sprintId,
        sprintName: sprint.sprintName,
        sprintEnd: sprint.sprintEnd.toISOString().split('T')[0],
        plannedPoints: est.plannedPoints,
        deliveredPoints: est.deliveredPoints,
        accuracy: est.accuracy,
      });
    }

    // Convert to array sorted by contributorId
    return Array.from(contributorMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([contributorId, sprintData]) => ({
        contributorId,
        sprints: sprintData,
      }));
  }

  /**
   * Get combined sprint metrics + evaluation scores per contributor.
   * Aggregates ContributorSprintEstimation data and queries evaluation table directly.
   */
  async getCombinedContributorMetrics(options: {
    domain?: string;
    limit: number;
  }): Promise<CombinedContributorMetric[]> {
    // Get last N sprints
    const sprints = await this.prisma.sprintMetric.findMany({
      where: { domain: options.domain ?? null },
      orderBy: { sprintEnd: 'desc' },
      take: options.limit,
      select: { id: true },
    });

    if (sprints.length === 0) return [];

    const sprintMetricIds = sprints.map((s) => s.id);

    // Fetch all contributor estimations for these sprints
    const estimations = await this.prisma.contributorSprintEstimation.findMany({
      where: { sprintMetricId: { in: sprintMetricIds } },
    });

    // Aggregate per contributor
    const contributorAgg = new Map<
      string,
      { planned: number; delivered: number; accuracies: number[]; sprintCount: number }
    >();

    for (const est of estimations) {
      const agg = contributorAgg.get(est.contributorId) ?? {
        planned: 0,
        delivered: 0,
        accuracies: [],
        sprintCount: 0,
      };
      agg.planned += est.plannedPoints;
      agg.delivered += est.deliveredPoints;
      if (est.accuracy != null) agg.accuracies.push(est.accuracy);
      agg.sprintCount += 1;
      contributorAgg.set(est.contributorId, agg);
    }

    const contributorIds = Array.from(contributorAgg.keys());
    if (contributorIds.length === 0) return [];

    // Fetch evaluation aggregates per contributor
    const evalAggregates = await this.prisma.evaluation.groupBy({
      by: ['contributorId'],
      where: {
        contributorId: { in: contributorIds },
        status: 'COMPLETED',
      },
      _count: { id: true },
      _avg: { compositeScore: true },
    });

    const evalMap = new Map(
      evalAggregates.map((e) => [
        e.contributorId,
        {
          count: e._count.id,
          avgScore:
            e._avg.compositeScore != null
              ? Math.round(Number(e._avg.compositeScore) * 100) / 100
              : null,
        },
      ]),
    );

    // Fetch contributor names
    const contributors = await this.prisma.contributor.findMany({
      where: { id: { in: contributorIds } },
      select: { id: true, name: true, githubUsername: true },
    });

    const nameMap = new Map(
      contributors.map((c) => [c.id, { name: c.name, githubUsername: c.githubUsername }]),
    );

    // Build result
    return contributorIds.sort().map((contributorId) => {
      const agg = contributorAgg.get(contributorId)!;
      const evalData = evalMap.get(contributorId);
      const nameData = nameMap.get(contributorId);

      const avgAccuracy =
        agg.accuracies.length > 0
          ? Math.round(
              (agg.accuracies.reduce((sum, a) => sum + a, 0) / agg.accuracies.length) * 100,
            ) / 100
          : null;

      return {
        contributorId,
        contributorName: nameData?.name ?? null,
        githubUsername: nameData?.githubUsername ?? null,
        sprintCount: agg.sprintCount,
        totalPlannedPoints: agg.planned,
        totalDeliveredPoints: agg.delivered,
        averageAccuracy: avgAccuracy,
        evaluationCount: evalData?.count ?? 0,
        averageEvaluationScore: evalData?.avgScore ?? null,
      };
    });
  }

  /**
   * Generate a sprint report as CSV string.
   */
  async generateSprintReportCsv(options: { domain?: string; limit: number }): Promise<string> {
    const velocityData = await this.getVelocityChartData(options);
    const combinedMetrics = await this.getCombinedContributorMetrics(options);

    const lines: string[] = [];

    // Sprint Velocity section
    lines.push('Sprint Velocity Report');
    lines.push('Sprint,End Date,Velocity (pts)');
    for (const v of velocityData) {
      lines.push(`"${this.escapeCsv(v.label)}","${v.x}",${v.y}`);
    }

    lines.push('');

    // Contributor Metrics section
    lines.push('Contributor Metrics');
    lines.push(
      'Contributor,GitHub Username,Sprint Count,Planned Points,Delivered Points,Avg Accuracy (%),Evaluations,Avg Eval Score',
    );
    for (const c of combinedMetrics) {
      const name = c.contributorName ?? c.contributorId.slice(0, 8);
      const username = c.githubUsername ?? '';
      const accuracy = c.averageAccuracy != null ? `${c.averageAccuracy}` : '';
      const evalScore = c.averageEvaluationScore != null ? `${c.averageEvaluationScore}` : '';
      lines.push(
        `"${this.escapeCsv(name)}","${this.escapeCsv(username)}",${c.sprintCount},${c.totalPlannedPoints},${c.totalDeliveredPoints},${accuracy},${c.evaluationCount},${evalScore}`,
      );
    }

    return lines.join('\n');
  }

  /**
   * Escape a string for safe CSV field embedding (RFC 4180).
   * Escapes double-quotes and neutralizes formula injection characters.
   */
  private escapeCsv(value: string): string {
    // Escape double-quotes per RFC 4180
    let escaped = value.replace(/"/g, '""');
    // Neutralize spreadsheet formula injection (=, +, -, @)
    if (/^[=+\-@]/.test(escaped)) {
      escaped = `'${escaped}`;
    }
    return escaped;
  }

  /**
   * Generate a sprint report as PDF buffer.
   */
  async generateSprintReportPdf(options: { domain?: string; limit: number }): Promise<Buffer> {
    const velocityData = await this.getVelocityChartData(options);
    const combinedMetrics = await this.getCombinedContributorMetrics(options);

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Title
      doc.fontSize(18).font('Helvetica-Bold').text('Sprint Report', { align: 'center' });
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Generated: ${new Date().toISOString().split('T')[0]}`, { align: 'center' });
      if (options.domain) {
        doc.text(`Domain: ${options.domain}`, { align: 'center' });
      }
      doc.moveDown(1);

      // Velocity section
      doc.fontSize(14).font('Helvetica-Bold').text('Sprint Velocity');
      doc.moveDown(0.5);

      if (velocityData.length === 0) {
        doc.fontSize(10).font('Helvetica').text('No velocity data available.');
      } else {
        // Table header
        doc.fontSize(9).font('Helvetica-Bold');
        const velY = doc.y;
        doc.text('Sprint', 50, velY, { width: 150 });
        doc.text('End Date', 200, velY, { width: 100 });
        doc.text('Velocity', 350, velY, { width: 80, align: 'right' });
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(450, doc.y).stroke();
        doc.moveDown(0.3);

        doc.fontSize(9).font('Helvetica');
        for (const v of velocityData) {
          const rowY = doc.y;
          doc.text(v.label, 50, rowY, { width: 150 });
          doc.text(v.x, 200, rowY, { width: 100 });
          doc.text(`${v.y} pts`, 350, rowY, { width: 80, align: 'right' });
          doc.moveDown(0.2);
        }
      }

      doc.moveDown(1);

      // Contributor section
      doc.fontSize(14).font('Helvetica-Bold').text('Contributor Metrics');
      doc.moveDown(0.5);

      if (combinedMetrics.length === 0) {
        doc.fontSize(10).font('Helvetica').text('No contributor data available.');
      } else {
        doc.fontSize(8).font('Helvetica-Bold');
        const contY = doc.y;
        doc.text('Contributor', 50, contY, { width: 100 });
        doc.text('Sprints', 150, contY, { width: 45, align: 'right' });
        doc.text('Planned', 200, contY, { width: 50, align: 'right' });
        doc.text('Delivered', 255, contY, { width: 55, align: 'right' });
        doc.text('Accuracy', 315, contY, { width: 55, align: 'right' });
        doc.text('Evals', 375, contY, { width: 40, align: 'right' });
        doc.text('Eval Score', 420, contY, { width: 60, align: 'right' });
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(500, doc.y).stroke();
        doc.moveDown(0.3);

        doc.fontSize(8).font('Helvetica');
        for (const c of combinedMetrics) {
          const rowY = doc.y;
          const name = c.contributorName ?? c.githubUsername ?? c.contributorId.slice(0, 8);
          doc.text(name, 50, rowY, { width: 100 });
          doc.text(`${c.sprintCount}`, 150, rowY, { width: 45, align: 'right' });
          doc.text(`${c.totalPlannedPoints}`, 200, rowY, { width: 50, align: 'right' });
          doc.text(`${c.totalDeliveredPoints}`, 255, rowY, { width: 55, align: 'right' });
          doc.text(c.averageAccuracy != null ? `${c.averageAccuracy}%` : '\u2014', 315, rowY, {
            width: 55,
            align: 'right',
          });
          doc.text(`${c.evaluationCount}`, 375, rowY, { width: 40, align: 'right' });
          doc.text(
            c.averageEvaluationScore != null ? `${c.averageEvaluationScore}` : '\u2014',
            420,
            rowY,
            { width: 60, align: 'right' },
          );
          doc.moveDown(0.2);
        }
      }

      doc.end();
    });
  }

  /**
   * Get personal sprint metrics for a specific contributor.
   * Aggregates velocity, estimation accuracy, and planning reliability data.
   */
  async getPersonalMetrics(contributorId: string): Promise<PersonalSprintMetrics> {
    this.logger.log({ msg: 'Fetching personal sprint metrics', contributorId });

    // Fetch contributor info
    const contributor = await this.prisma.contributor.findUnique({
      where: { id: contributorId },
      select: { id: true, name: true, domain: true },
    });

    // Fetch all estimation records for this contributor (across all sprints)
    const estimations = await this.prisma.contributorSprintEstimation.findMany({
      where: { contributorId },
      orderBy: { sprintMetric: { sprintEnd: 'asc' } },
      include: {
        sprintMetric: {
          select: { sprintId: true, sprintName: true, sprintEnd: true },
        },
      },
    });

    // Build velocity and estimation accuracy arrays
    const velocity: PersonalSprintMetrics['velocity'] = [];
    const estimationAccuracy: PersonalSprintMetrics['estimationAccuracy'] = [];

    for (const est of estimations) {
      velocity.push({
        sprintId: est.sprintMetric.sprintId,
        sprintName: est.sprintMetric.sprintName,
        sprintEnd: est.sprintMetric.sprintEnd.toISOString().split('T')[0],
        deliveredPoints: est.deliveredPoints,
      });

      estimationAccuracy.push({
        sprintId: est.sprintMetric.sprintId,
        sprintName: est.sprintMetric.sprintName,
        sprintEnd: est.sprintMetric.sprintEnd.toISOString().split('T')[0],
        plannedPoints: est.plannedPoints,
        deliveredPoints: est.deliveredPoints,
        accuracy: est.accuracy,
      });
    }

    // Fetch planning reliability data
    const reliabilityRecords = await this.prisma.planningReliability.findMany({
      where: { contributorId },
      orderBy: { createdAt: 'asc' },
    });

    // Get sprint info for reliability trend
    const relSprintIds = [...new Set(reliabilityRecords.map((r) => r.sprintId))];
    const relSprints =
      relSprintIds.length > 0
        ? await this.prisma.sprintMetric.findMany({
            where: { sprintId: { in: relSprintIds }, domain: null },
            select: { sprintId: true, sprintName: true, sprintEnd: true },
          })
        : [];
    const relSprintMap = new Map(relSprints.map((s) => [s.sprintId, s]));

    const ratios = reliabilityRecords
      .filter((r) => r.deliveryRatio !== null)
      .map((r) => r.deliveryRatio!);
    const variances = reliabilityRecords
      .filter((r) => r.estimationVariance !== null)
      .map((r) => r.estimationVariance!);

    const planningReliability: PersonalSprintMetrics['planningReliability'] = {
      averageDeliveryRatio:
        ratios.length > 0
          ? Math.round((ratios.reduce((sum, r) => sum + r, 0) / ratios.length) * 100) / 100
          : null,
      averageEstimationVariance:
        variances.length > 0
          ? Math.round((variances.reduce((sum, v) => sum + v, 0) / variances.length) * 100) / 100
          : null,
      trend: reliabilityRecords.map((r) => {
        const sprint = relSprintMap.get(r.sprintId);
        return {
          sprintId: r.sprintId,
          sprintName: sprint?.sprintName ?? r.sprintId,
          sprintEnd: sprint?.sprintEnd?.toISOString().split('T')[0] ?? '',
          deliveryRatio: r.deliveryRatio,
          estimationVariance: r.estimationVariance,
        };
      }),
    };

    // Build summary
    const totalDelivered = velocity.reduce((sum, v) => sum + v.deliveredPoints, 0);
    const validAccuracies = estimationAccuracy
      .filter((e) => e.accuracy !== null)
      .map((e) => e.accuracy!);

    const summary: PersonalSprintMetrics['summary'] = {
      totalSprints: velocity.length,
      totalDeliveredPoints: totalDelivered,
      averageVelocity:
        velocity.length > 0 ? Math.round((totalDelivered / velocity.length) * 100) / 100 : null,
      averageAccuracy:
        validAccuracies.length > 0
          ? Math.round(
              (validAccuracies.reduce((sum, a) => sum + a, 0) / validAccuracies.length) * 100,
            ) / 100
          : null,
    };

    return {
      contributorId,
      contributorName: contributor?.name ?? null,
      domain: contributor?.domain ?? null,
      velocity,
      estimationAccuracy,
      planningReliability,
      summary,
    };
  }

  /**
   * Find a sprint metric by sprintId and optional domain.
   */
  private async findSprintMetric(sprintId: string, domain?: string): Promise<SprintMetric | null> {
    return this.prisma.sprintMetric.findFirst({
      where: {
        sprintId,
        domain: domain ?? null,
      },
    });
  }
}

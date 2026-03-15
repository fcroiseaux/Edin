import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ZenhubConfigService } from './zenhub-config.service.js';
import type {
  ZenhubIssueData,
  ZenhubWebhookReceivedEvent,
  ZenhubTaskCreatedEvent,
  ZenhubTaskStatusSyncedEvent,
  ZenhubTaskPointsSyncedEvent,
  ZenhubSyncConflictDetail,
} from '@edin/shared';

/** Edin ContributorDomain values used for task domain mapping. */
const VALID_DOMAINS = ['Technology', 'Finance', 'Impact', 'Governance'] as const;
type ContributorDomain = (typeof VALID_DOMAINS)[number];

/** Terminal task statuses that should not be overwritten by Zenhub sync. */
const TERMINAL_STATUSES = ['EVALUATED', 'RETIRED'] as const;

@Injectable()
export class ZenhubTaskSyncService {
  private readonly logger = new Logger(ZenhubTaskSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly zenhubConfigService: ZenhubConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Process a batch of polled issues and create tasks for those with the configured label.
   */
  async processPolledIssues(
    issues: ZenhubIssueData[],
    workspaceDomain: string,
    correlationId: string,
  ): Promise<{ created: number; skipped: number }> {
    const enabled = await this.zenhubConfigService.resolveTaskSyncEnabled();
    if (!enabled) {
      return { created: 0, skipped: issues.length };
    }

    const label = await this.zenhubConfigService.resolveContributorTaskLabel();
    if (!label) {
      this.logger.debug('No contributor task label configured, skipping task sync', {
        correlationId,
      });
      return { created: 0, skipped: issues.length };
    }

    const labeledIssues = issues.filter((issue) =>
      issue.labels?.nodes?.some((l) => l.name === label),
    );

    let created = 0;
    let skipped = 0;

    for (const issue of labeledIssues) {
      const result = await this.syncTaskFromIssue(issue, workspaceDomain, correlationId);
      if (result) {
        created++;
      } else {
        skipped++;
      }
    }

    if (created > 0) {
      this.logger.log('Task sync from poll completed', {
        created,
        skipped,
        totalLabeled: labeledIssues.length,
        correlationId,
      });
    }

    return { created, skipped: issues.length - created };
  }

  /**
   * Create an Edin task from a Zenhub issue. Returns the task ID if created, null if skipped.
   * Idempotent: if a task with this zenhubIssueId already exists, it is skipped.
   */
  async syncTaskFromIssue(
    issue: ZenhubIssueData,
    workspaceDomain: string,
    correlationId: string,
  ): Promise<string | null> {
    const creatorId = await this.zenhubConfigService.resolveTaskSyncCreatorId();
    if (!creatorId) {
      this.logger.warn('Task sync creator ID not configured, skipping task creation', {
        zenhubIssueId: issue.id,
        correlationId,
      });
      return null;
    }

    // Check idempotency: task with this zenhubIssueId already exists?
    const existing = await this.prisma.task.findUnique({
      where: { zenhubIssueId: issue.id },
      select: { id: true },
    });

    if (existing) {
      this.logger.debug('Task already exists for Zenhub issue, skipping', {
        zenhubIssueId: issue.id,
        existingTaskId: existing.id,
        correlationId,
      });
      return null;
    }

    const domain = this.resolveDomain(workspaceDomain);
    const description = issue.body?.trim() || issue.title;
    const estimatedEffort = issue.estimate?.value
      ? `${issue.estimate.value} story points`
      : 'Unestimated';

    try {
      const task = await this.prisma.task.create({
        data: {
          title: issue.title.slice(0, 200),
          description,
          domain,
          difficulty: 'INTERMEDIATE',
          estimatedEffort,
          status: 'AVAILABLE',
          zenhubIssueId: issue.id,
          createdById: creatorId,
        },
      });

      this.logger.log('Task created from Zenhub issue', {
        taskId: task.id,
        zenhubIssueId: issue.id,
        issueNumber: issue.number,
        domain,
        correlationId,
      });

      // Auto-claim if assignee matches a contributor
      await this.tryAutoClaimTask(task.id, issue, correlationId);

      // Emit task created event
      const event: ZenhubTaskCreatedEvent = {
        eventType: 'zenhub.task.created',
        timestamp: new Date().toISOString(),
        correlationId,
        payload: {
          taskId: task.id,
          zenhubIssueId: issue.id,
          issueNumber: issue.number,
          title: task.title,
          domain,
        },
      };
      this.eventEmitter.emit('zenhub.task.created', event);

      // Also emit the standard task.created event for activity feed / notifications
      this.eventEmitter.emit('task.created', {
        eventType: 'task.created',
        timestamp: new Date().toISOString(),
        correlationId,
        actorId: creatorId,
        payload: {
          taskId: task.id,
          title: task.title,
          domain,
          difficulty: 'INTERMEDIATE',
        },
      });

      return task.id;
    } catch (error) {
      // P2002 = unique constraint violation (race condition on zenhubIssueId)
      if (this.isPrismaUniqueConstraintError(error)) {
        this.logger.debug('Duplicate task creation attempt caught by constraint', {
          zenhubIssueId: issue.id,
          correlationId,
        });
        return null;
      }
      throw error;
    }
  }

  /**
   * Sync the status of a linked Edin task from a Zenhub issue's pipeline.
   * Returns whether the task status was updated.
   */
  async syncStatusFromIssue(
    issue: ZenhubIssueData,
    correlationId: string,
  ): Promise<{ updated: boolean }> {
    const enabled = await this.zenhubConfigService.resolveStatusSyncEnabled();
    if (!enabled) {
      return { updated: false };
    }

    const pipelineName = issue.pipelineIssue?.pipeline?.name;
    if (!pipelineName) {
      return { updated: false };
    }

    // Find linked task
    const task = await this.prisma.task.findUnique({
      where: { zenhubIssueId: issue.id },
      select: { id: true, status: true, estimatedEffort: true },
    });

    if (!task) {
      this.logger.debug('No linked task for Zenhub issue, skipping status sync', {
        zenhubIssueId: issue.id,
        correlationId,
      });
      return { updated: false };
    }

    // Do not overwrite terminal statuses
    if (TERMINAL_STATUSES.includes(task.status as (typeof TERMINAL_STATUSES)[number])) {
      this.logger.debug('Task in terminal status, skipping status sync', {
        taskId: task.id,
        currentStatus: task.status,
        correlationId,
      });
      return { updated: false };
    }

    // Look up the mapping
    const mapping = await this.zenhubConfigService.resolvePipelineStatusMapping();
    const mappedStatus = mapping[pipelineName];

    if (!mappedStatus) {
      this.logger.warn('Unmapped Zenhub pipeline name, skipping status sync', {
        pipelineName,
        taskId: task.id,
        zenhubIssueId: issue.id,
        correlationId,
      });

      // Log a pending conflict for admin review
      const conflictDetail: ZenhubSyncConflictDetail = {
        edinStatus: task.status,
        zenhubPipeline: pipelineName,
        zenhubMappedStatus: null,
        appliedStatus: null,
        taskId: task.id,
        zenhubIssueId: issue.id,
      };
      await this.logSyncConflict(task.id, 'pending', conflictDetail, correlationId);

      return { updated: false };
    }

    // Idempotent: skip if already matching
    if (task.status === mappedStatus) {
      return { updated: false };
    }

    const previousStatus = task.status;

    // Log auto-resolved conflict (Zenhub is source of truth)
    const conflictDetail: ZenhubSyncConflictDetail = {
      edinStatus: previousStatus,
      zenhubPipeline: pipelineName,
      zenhubMappedStatus: mappedStatus,
      appliedStatus: mappedStatus,
      taskId: task.id,
      zenhubIssueId: issue.id,
    };
    await this.logSyncConflict(task.id, 'auto-resolved', conflictDetail, correlationId);

    // Build update data with side-effects
    const updateData: Record<string, unknown> = { status: mappedStatus };
    if (mappedStatus === 'COMPLETED') {
      updateData.completedAt = new Date();
    } else if (previousStatus === 'COMPLETED') {
      updateData.completedAt = null;
    }

    await this.prisma.task.update({
      where: { id: task.id },
      data: updateData,
    });

    this.logger.log('Task status synced from Zenhub pipeline', {
      taskId: task.id,
      zenhubIssueId: issue.id,
      previousStatus,
      newStatus: mappedStatus,
      pipelineName,
      correlationId,
    });

    // Emit task.status-changed event (same shape as TaskService)
    this.eventEmitter.emit('task.status-changed', {
      eventType: 'task.status-changed',
      timestamp: new Date().toISOString(),
      correlationId,
      actorId: 'system',
      payload: {
        taskId: task.id,
        previousStatus,
        newStatus: mappedStatus,
      },
    });

    // Emit zenhub.task.status.synced event
    const syncEvent: ZenhubTaskStatusSyncedEvent = {
      eventType: 'zenhub.task.status.synced',
      timestamp: new Date().toISOString(),
      correlationId,
      payload: {
        taskId: task.id,
        zenhubIssueId: issue.id,
        previousStatus,
        newStatus: mappedStatus,
        pipelineName,
      },
    };
    this.eventEmitter.emit('zenhub.task.status.synced', syncEvent);

    return { updated: true };
  }

  /**
   * Sync the story point estimate of a linked Edin task from a Zenhub issue.
   * Returns whether the task estimate was updated.
   */
  async syncEstimateFromIssue(
    issue: ZenhubIssueData,
    correlationId: string,
  ): Promise<{ updated: boolean }> {
    const enabled = await this.zenhubConfigService.resolveTaskSyncEnabled();
    if (!enabled) {
      return { updated: false };
    }

    // Find linked task
    const task = await this.prisma.task.findUnique({
      where: { zenhubIssueId: issue.id },
      select: { id: true, estimatedEffort: true },
    });

    if (!task) {
      this.logger.debug('No linked task for Zenhub issue, skipping estimate sync', {
        zenhubIssueId: issue.id,
        correlationId,
      });
      return { updated: false };
    }

    const newEstimate = issue.estimate?.value
      ? `${issue.estimate.value} story points`
      : 'Unestimated';

    // Idempotent: skip if already matching
    if (task.estimatedEffort === newEstimate) {
      return { updated: false };
    }

    const previousEstimate = task.estimatedEffort;

    await this.prisma.task.update({
      where: { id: task.id },
      data: { estimatedEffort: newEstimate },
    });

    this.logger.log('Task estimate synced from Zenhub issue', {
      taskId: task.id,
      zenhubIssueId: issue.id,
      previousEstimate,
      newEstimate,
      correlationId,
    });

    // Emit zenhub.task.points.synced event
    const syncEvent: ZenhubTaskPointsSyncedEvent = {
      eventType: 'zenhub.task.points.synced',
      timestamp: new Date().toISOString(),
      correlationId,
      payload: {
        taskId: task.id,
        zenhubIssueId: issue.id,
        previousEstimate,
        newEstimate,
        storyPoints: issue.estimate?.value ?? null,
      },
    };
    this.eventEmitter.emit('zenhub.task.points.synced', syncEvent);

    return { updated: true };
  }

  /**
   * Sync status and estimates for existing linked tasks from polled issues.
   */
  async syncExistingTasksFromPolledIssues(
    issues: ZenhubIssueData[],
    correlationId: string,
  ): Promise<{ statusUpdated: number; estimateUpdated: number; skipped: number }> {
    let statusUpdated = 0;
    let estimateUpdated = 0;
    let skipped = 0;

    for (const issue of issues) {
      const statusResult = await this.syncStatusFromIssue(issue, correlationId);
      const estimateResult = await this.syncEstimateFromIssue(issue, correlationId);

      if (statusResult.updated) statusUpdated++;
      if (estimateResult.updated) estimateUpdated++;
      if (!statusResult.updated && !estimateResult.updated) skipped++;
    }

    if (statusUpdated > 0 || estimateUpdated > 0) {
      this.logger.log('Existing task sync from poll completed', {
        statusUpdated,
        estimateUpdated,
        skipped,
        totalIssues: issues.length,
        correlationId,
      });
    }

    return { statusUpdated, estimateUpdated, skipped };
  }

  /**
   * Handle webhook events that may contain labeled issues for task creation,
   * or status/estimate changes for existing tasks.
   */
  @OnEvent('zenhub.webhook.received')
  async handleWebhookEvent(event: ZenhubWebhookReceivedEvent): Promise<void> {
    try {
      // Load the sync record to get the full webhook payload
      const syncRecord = await this.prisma.zenhubSync.findUnique({
        where: { id: event.payload.syncId },
        select: { payload: true, eventType: true },
      });

      if (!syncRecord?.payload || typeof syncRecord.payload !== 'object') return;

      const payload = syncRecord.payload as Record<string, unknown>;
      const webhookEventType = event.payload.webhookEventType;

      // Extract issue data from webhook payload if available
      const issueData = this.extractIssueFromWebhookPayload(payload);
      if (!issueData) return;

      // Handle status sync for pipeline transitions (issue_transfer)
      if (webhookEventType === 'issue_transfer') {
        // Enrich issue with pipeline data from payload
        const enrichedIssue = this.enrichIssueWithPipelineFromPayload(issueData, payload);
        await this.syncStatusFromIssue(enrichedIssue, event.correlationId);
      }

      // Handle estimate sync for estimate changes
      if (webhookEventType === 'estimate_set' || webhookEventType === 'estimate_cleared') {
        const enrichedIssue = this.enrichIssueWithEstimateFromPayload(issueData, payload);
        await this.syncEstimateFromIssue(enrichedIssue, event.correlationId);
      }

      // Handle task creation for labeled issues (existing zh-5-1 logic)
      const taskSyncEnabled = await this.zenhubConfigService.resolveTaskSyncEnabled();
      if (!taskSyncEnabled) return;

      const label = await this.zenhubConfigService.resolveContributorTaskLabel();
      if (!label) return;

      const issueLabels = this.extractLabelsFromPayload(payload);
      if (!issueLabels.includes(label)) return;

      const workspaceId = payload.workspace_id as string | undefined;
      const domain = await this.resolveDomainFromWorkspaceId(workspaceId);

      await this.syncTaskFromIssue(issueData, domain, event.correlationId);
    } catch (error) {
      this.logger.warn('Task sync from webhook failed', {
        syncId: event.payload.syncId,
        error: error instanceof Error ? error.message : String(error),
        correlationId: event.correlationId,
      });
    }
  }

  /**
   * Log a sync conflict to zenhub_sync_conflicts and emit sprint.sync.conflict event.
   * Non-blocking: failures are logged but do not prevent the sync from proceeding.
   */
  private async logSyncConflict(
    taskId: string,
    resolution: 'auto-resolved' | 'pending',
    detail: ZenhubSyncConflictDetail,
    correlationId: string,
  ): Promise<void> {
    try {
      const conflict = await this.prisma.zenhubSyncConflict.create({
        data: {
          conflictType: 'SPRINT_SYNC_CONFLICT',
          affectedEntity: 'Task',
          affectedEntityId: taskId,
          resolution,
          outcome: JSON.stringify(detail),
          occurredAt: new Date(),
        },
      });

      this.eventEmitter.emit('sprint.sync.conflict', {
        eventType: 'sprint.sync.conflict',
        timestamp: new Date().toISOString(),
        correlationId,
        payload: {
          conflictId: conflict.id,
          conflictType: 'SPRINT_SYNC_CONFLICT',
          resolution,
          taskId,
          detail,
        },
      });
    } catch (error) {
      this.logger.warn('Failed to log sync conflict', {
        taskId,
        resolution,
        error: error instanceof Error ? error.message : String(error),
        correlationId,
      });
    }
  }

  /**
   * Try to auto-claim a task if the Zenhub issue has an assignee matching a contributor.
   */
  private async tryAutoClaimTask(
    taskId: string,
    issue: ZenhubIssueData,
    correlationId: string,
  ): Promise<void> {
    const assigneeLogin = issue.assignees?.nodes?.[0]?.login;
    if (!assigneeLogin) return;

    const contributor = await this.prisma.contributor.findUnique({
      where: { githubUsername: assigneeLogin },
      select: { id: true },
    });

    if (!contributor) {
      this.logger.debug('Zenhub issue assignee not found as contributor', {
        assigneeLogin,
        taskId,
        correlationId,
      });
      return;
    }

    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'CLAIMED',
        claimedById: contributor.id,
        claimedAt: new Date(),
      },
    });

    this.logger.log('Task auto-claimed from Zenhub assignee', {
      taskId,
      contributorId: contributor.id,
      assigneeLogin,
      correlationId,
    });

    this.eventEmitter.emit('task.claimed', {
      eventType: 'task.claimed',
      timestamp: new Date().toISOString(),
      correlationId,
      actorId: contributor.id,
      payload: {
        taskId,
        contributorId: contributor.id,
      },
    });
  }

  /**
   * Resolve a workspace domain string to a valid ContributorDomain.
   * Falls back to 'Technology' for unrecognized domains.
   */
  private resolveDomain(workspaceDomain: string): ContributorDomain {
    // Handle 'default' workspace key — map to Technology
    if (workspaceDomain === 'default') return 'Technology';

    // Try exact match first (case-insensitive)
    const match = VALID_DOMAINS.find((d) => d.toLowerCase() === workspaceDomain.toLowerCase());
    if (match) return match;

    return 'Technology';
  }

  /**
   * Resolve domain from a workspace ID by looking up the workspace mapping.
   */
  private async resolveDomainFromWorkspaceId(workspaceId?: string): Promise<string> {
    if (!workspaceId) return 'Technology';

    const mapping = await this.zenhubConfigService.resolveWorkspaceMapping();
    if (!mapping) return 'Technology';

    // Reverse lookup: find domain key whose value matches the workspace ID
    for (const [domain, wsId] of Object.entries(mapping)) {
      if (wsId === workspaceId) return domain;
    }

    return 'Technology';
  }

  /**
   * Extract issue data from a Zenhub webhook payload.
   */
  private extractIssueFromWebhookPayload(payload: Record<string, unknown>): ZenhubIssueData | null {
    // Zenhub webhook payloads may include issue data in different structures
    const issue = (payload.issue ?? payload) as Record<string, unknown>;
    if (!issue.id || !issue.number || !issue.title) return null;

    return {
      id: String(issue.id as string | number),
      number: Number(issue.number),
      title: String(issue.title as string),
      body: issue.body ? String(issue.body as string) : undefined,
      estimate: issue.estimate as ZenhubIssueData['estimate'],
      labels: issue.labels as ZenhubIssueData['labels'],
      assignees: issue.assignees as ZenhubIssueData['assignees'],
    };
  }

  /**
   * Extract label names from a webhook payload.
   */
  private extractLabelsFromPayload(payload: Record<string, unknown>): string[] {
    const issue = (payload.issue ?? payload) as Record<string, unknown>;
    const labels = issue.labels as { nodes?: Array<{ name: string }> } | undefined;
    if (!labels?.nodes) return [];
    return labels.nodes.map((l) => l.name);
  }

  /**
   * Enrich issue data with pipeline info from webhook payload.
   * Zenhub issue_transfer events include to_pipeline data.
   */
  private enrichIssueWithPipelineFromPayload(
    issue: ZenhubIssueData,
    payload: Record<string, unknown>,
  ): ZenhubIssueData {
    const toPipeline = payload.to_pipeline as { name?: string; id?: string } | undefined;
    if (toPipeline?.name) {
      return {
        ...issue,
        pipelineIssue: {
          pipeline: {
            id: toPipeline.id ? String(toPipeline.id) : '',
            name: toPipeline.name,
          },
        },
      };
    }
    return issue;
  }

  /**
   * Enrich issue data with estimate info from webhook payload.
   * Zenhub estimate_set events include the new estimate value.
   */
  private enrichIssueWithEstimateFromPayload(
    issue: ZenhubIssueData,
    payload: Record<string, unknown>,
  ): ZenhubIssueData {
    const estimate = payload.estimate as { value?: number } | undefined;
    if (estimate && typeof estimate.value === 'number') {
      return { ...issue, estimate: { value: estimate.value } };
    }
    // estimate_cleared: set estimate to null
    return { ...issue, estimate: null };
  }

  private isPrismaUniqueConstraintError(error: unknown): boolean {
    return (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    );
  }
}

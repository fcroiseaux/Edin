import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import type {
  ActivityEventType,
  FeedbackAssignmentEvent,
  FeedbackSubmittedEvent,
  FeedbackReassignedEvent,
  EvaluationCompletedEvent,
  SprintActivityPayload,
} from '@edin/shared';
import type {
  ContributionType as PrismaContributionType,
  ContributorDomain,
} from '../../../generated/prisma/client/client.js';

const ACTIVITY_FEED_CHANNEL = 'activity-feed';

interface ContributionIngestedPayload {
  contributionId: string;
  contributionType: string;
  contributorId: string | null;
  repositoryId: string;
  correlationId: string;
}

interface WorkingGroupMemberJoinedPayload {
  eventType: string;
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    workingGroupId: string;
    contributorId: string;
    workingGroupName: string;
  };
}

interface AnnouncementCreatedPayload {
  eventType: string;
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    announcementId: string;
    workingGroupId: string;
    authorId: string;
    content: string;
  };
}

interface TaskStatusChangedPayload {
  eventType: string;
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    taskId: string;
    title: string;
    domain: string;
    oldStatus: string;
    newStatus: string;
    contributorId?: string;
  };
}

export const SPRINT_EVENT_TYPES = [
  'SPRINT_STARTED',
  'SPRINT_COMPLETED',
  'SPRINT_VELOCITY_MILESTONE',
] as const;

interface ActivityFeedQuery {
  cursor?: string;
  limit: number;
  domain?: string;
  excludeEventTypes?: string[];
}

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async getFeed(query: ActivityFeedQuery) {
    const { cursor, limit = 20, domain, excludeEventTypes } = query;

    const where: Record<string, unknown> = {};
    if (domain) {
      where.domain = domain;
    }
    if (excludeEventTypes && excludeEventTypes.length > 0) {
      where.eventType = { notIn: excludeEventTypes };
    }
    if (cursor) {
      const separatorIdx = cursor.lastIndexOf('|');
      if (separatorIdx > 0) {
        const cursorDate = cursor.slice(0, separatorIdx);
        const cursorId = cursor.slice(separatorIdx + 1);
        where.OR = [
          { createdAt: { lt: new Date(cursorDate) } },
          { createdAt: new Date(cursorDate), id: { lt: cursorId } },
        ];
      } else {
        where.createdAt = { lt: new Date(cursor) };
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.activityEvent.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        include: {
          contributor: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.activityEvent.count({
        where: {
          ...(domain ? { domain: domain as ContributorDomain } : {}),
          ...(excludeEventTypes?.length ? { eventType: { notIn: excludeEventTypes } } : {}),
        },
      }),
    ]);

    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;
    const lastItem = resultItems.length > 0 ? resultItems[resultItems.length - 1] : null;
    const nextCursor =
      hasMore && lastItem ? `${lastItem.createdAt.toISOString()}|${lastItem.id}` : null;

    const mapped = resultItems.map((item) => ({
      id: item.id,
      eventType: item.eventType,
      title: item.title,
      description: item.description,
      contributorId: item.contributorId,
      contributorName: item.contributor.name,
      contributorAvatarUrl: item.contributor.avatarUrl,
      domain: item.domain,
      contributionType: item.contributionType,
      entityId: item.entityId,
      metadata: item.metadata as Record<string, unknown> | null,
      createdAt: item.createdAt.toISOString(),
    }));

    return {
      items: mapped,
      pagination: {
        cursor: nextCursor,
        hasMore,
        total,
      },
    };
  }

  async getPublicFeed(query: Omit<ActivityFeedQuery, 'excludeEventTypes'>) {
    const result = await this.getFeed({
      ...query,
      excludeEventTypes: [...SPRINT_EVENT_TYPES],
    });

    const publicItems = result.items.map((item) => ({
      id: item.id,
      eventType: item.eventType,
      title: item.title,
      description: item.description,
      contributorName: item.contributorName,
      contributorAvatarUrl: item.contributorAvatarUrl,
      domain: item.domain,
      contributionType: item.contributionType,
      entityId: item.entityId,
      createdAt: item.createdAt,
    }));

    return {
      items: publicItems,
      pagination: result.pagination,
    };
  }

  async createActivityEvent(data: {
    eventType: ActivityEventType;
    title: string;
    description?: string;
    contributorId: string;
    domain: ContributorDomain;
    contributionType?: PrismaContributionType;
    entityId: string;
    metadata?: Record<string, unknown>;
  }) {
    const event = await this.prisma.activityEvent.create({
      data: {
        eventType: data.eventType as never,
        title: data.title,
        description: data.description ?? null,
        contributor: { connect: { id: data.contributorId } },
        domain: data.domain as never,
        contributionType: data.contributionType ?? null,
        entityId: data.entityId,
        metadata: (data.metadata as undefined | Record<string, never>) ?? undefined,
      },
      include: {
        contributor: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    const contributor = (
      event as unknown as { contributor: { id: string; name: string; avatarUrl: string | null } }
    ).contributor;

    const ssePayload = {
      type: 'activity.new' as const,
      activity: {
        id: event.id,
        eventType: event.eventType,
        title: event.title,
        description: event.description,
        contributorId: event.contributorId,
        contributorName: contributor.name,
        contributorAvatarUrl: contributor.avatarUrl,
        domain: event.domain,
        contributionType: event.contributionType,
        entityId: event.entityId,
        metadata: event.metadata as Record<string, unknown> | null,
        createdAt: event.createdAt.toISOString(),
      },
    };

    await this.redisService.publish(ACTIVITY_FEED_CHANNEL, JSON.stringify(ssePayload));

    this.logger.log('Activity event created and published', {
      module: 'activity',
      eventType: data.eventType,
      entityId: data.entityId,
    });

    return event;
  }

  @OnEvent('contribution.commit.ingested')
  async handleCommitIngested(payload: ContributionIngestedPayload): Promise<void> {
    await this.handleContributionIngested(payload, 'COMMIT');
  }

  @OnEvent('contribution.pull_request.ingested')
  async handlePrIngested(payload: ContributionIngestedPayload): Promise<void> {
    await this.handleContributionIngested(payload, 'PULL_REQUEST');
  }

  @OnEvent('contribution.review.ingested')
  async handleReviewIngested(payload: ContributionIngestedPayload): Promise<void> {
    await this.handleContributionIngested(payload, 'CODE_REVIEW');
  }

  private async handleContributionIngested(
    payload: ContributionIngestedPayload,
    contributionType: PrismaContributionType,
  ): Promise<void> {
    if (!payload.contributorId) {
      this.logger.debug('Skipping activity event for unattributed contribution', {
        module: 'activity',
        contributionId: payload.contributionId,
      });
      return;
    }

    const contribution = await this.prisma.contribution.findUnique({
      where: { id: payload.contributionId },
      include: {
        contributor: { select: { domain: true } },
        repository: { select: { fullName: true } },
      },
    });

    if (!contribution || !contribution.contributor) return;

    const contributorData = contribution.contributor as { domain: ContributorDomain | null };
    const typeLabel =
      contributionType === 'COMMIT'
        ? 'Commit'
        : contributionType === 'PULL_REQUEST'
          ? 'Pull Request'
          : 'Code Review';

    await this.createActivityEvent({
      eventType: 'CONTRIBUTION_NEW',
      title: `New ${typeLabel}: ${contribution.title}`,
      description: contribution.description?.slice(0, 200) ?? undefined,
      contributorId: payload.contributorId,
      domain: contributorData.domain ?? ('Technology' as ContributorDomain),
      contributionType,
      entityId: payload.contributionId,
      metadata: {
        repositoryFullName: contribution.repository.fullName,
        sourceRef: contribution.sourceRef,
      },
    });
  }

  @OnEvent('working-group.member.joined')
  async handleMemberJoined(event: WorkingGroupMemberJoinedPayload): Promise<void> {
    const workingGroup = await this.prisma.workingGroup.findUnique({
      where: { id: event.payload.workingGroupId },
      select: { domain: true, name: true },
    });

    if (!workingGroup) return;

    const contributor = await this.prisma.contributor.findUnique({
      where: { id: event.payload.contributorId },
      select: { name: true },
    });

    await this.createActivityEvent({
      eventType: 'MEMBER_JOINED',
      title: `${contributor?.name ?? 'A contributor'} joined ${workingGroup.name}`,
      contributorId: event.payload.contributorId,
      domain: workingGroup.domain,
      entityId: event.payload.workingGroupId,
      metadata: {
        workingGroupName: workingGroup.name,
      },
    });
  }

  @OnEvent('working-group.announcement.created')
  async handleAnnouncementCreated(event: AnnouncementCreatedPayload): Promise<void> {
    const workingGroup = await this.prisma.workingGroup.findUnique({
      where: { id: event.payload.workingGroupId },
      select: { domain: true, name: true },
    });

    if (!workingGroup) return;

    await this.createActivityEvent({
      eventType: 'ANNOUNCEMENT_CREATED',
      title: `New announcement in ${workingGroup.name}`,
      description: event.payload.content.slice(0, 200),
      contributorId: event.payload.authorId,
      domain: workingGroup.domain,
      entityId: event.payload.announcementId,
      metadata: {
        workingGroupName: workingGroup.name,
      },
    });
  }

  @OnEvent('feedback.review.assigned')
  async handleFeedbackAssigned(event: FeedbackAssignmentEvent): Promise<void> {
    try {
      await this.createActivityEvent({
        eventType: 'FEEDBACK_ASSIGNED',
        title: `Peer review assigned for ${event.payload.contributionTitle}`,
        contributorId: event.payload.reviewerId,
        domain: (event.payload.domain as ContributorDomain) ?? ('Technology' as ContributorDomain),
        entityId: event.payload.peerFeedbackId,
        metadata: {
          contributionId: event.payload.contributionId,
          contributionType: event.payload.contributionType,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to create feedback assigned activity event', {
        module: 'activity',
        peerFeedbackId: event.payload.peerFeedbackId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  @OnEvent('feedback.review.submitted')
  async handleFeedbackSubmitted(event: FeedbackSubmittedEvent): Promise<void> {
    try {
      await this.createActivityEvent({
        eventType: 'FEEDBACK_SUBMITTED',
        title: `Peer feedback submitted for ${event.payload.contributionTitle}`,
        contributorId: event.payload.reviewerId,
        domain: (event.payload.domain as ContributorDomain) ?? ('Technology' as ContributorDomain),
        entityId: event.payload.peerFeedbackId,
        metadata: {
          contributionId: event.payload.contributionId,
          contributionType: event.payload.contributionType,
          peerFeedbackId: event.payload.peerFeedbackId,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to create feedback submitted activity event', {
        module: 'activity',
        peerFeedbackId: event.payload.peerFeedbackId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  @OnEvent('feedback.review.reassigned')
  async handleFeedbackReassigned(event: FeedbackReassignedEvent): Promise<void> {
    try {
      await this.createActivityEvent({
        eventType: 'FEEDBACK_REASSIGNED',
        title: `Peer review reassigned for ${event.payload.contributionTitle}`,
        contributorId: event.payload.newReviewerId,
        domain: (event.payload.domain as ContributorDomain) ?? ('Technology' as ContributorDomain),
        entityId: event.payload.newPeerFeedbackId,
        metadata: {
          peerFeedbackId: event.payload.peerFeedbackId,
          contributionId: event.payload.contributionId,
          contributionType: event.payload.contributionType,
          oldReviewerId: event.payload.oldReviewerId,
          newReviewerId: event.payload.newReviewerId,
          reason: event.payload.reason,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to create feedback reassigned activity event', {
        module: 'activity',
        peerFeedbackId: event.payload.peerFeedbackId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  @OnEvent('evaluation.score.completed')
  async handleEvaluationCompleted(event: EvaluationCompletedEvent): Promise<void> {
    try {
      await this.createActivityEvent({
        eventType: 'EVALUATION_COMPLETED',
        title: `Your contribution '${event.payload.contributionTitle}' has been evaluated`,
        contributorId: event.payload.contributorId,
        domain: (event.payload.domain as ContributorDomain) ?? ('Technology' as ContributorDomain),
        entityId: event.payload.evaluationId,
        metadata: {
          evaluationId: event.payload.evaluationId,
          contributionId: event.payload.contributionId,
          contributionType: event.payload.contributionType,
          compositeScore: event.payload.compositeScore,
          domain: event.payload.domain,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to create evaluation completed activity event', {
        module: 'activity',
        evaluationId: event.payload.evaluationId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  @OnEvent('task.status-changed')
  async handleTaskStatusChanged(event: TaskStatusChangedPayload): Promise<void> {
    if (event.payload.newStatus !== 'COMPLETED') return;

    const contributorId = event.payload.contributorId ?? event.actorId;
    if (!contributorId) return;

    await this.createActivityEvent({
      eventType: 'TASK_COMPLETED',
      title: `Task completed: ${event.payload.title}`,
      contributorId,
      domain: event.payload.domain as ContributorDomain,
      entityId: event.payload.taskId,
      metadata: {
        taskTitle: event.payload.title,
      },
    });
  }

  @OnEvent('sprint.lifecycle.started')
  async handleSprintStarted(event: SprintActivityPayload): Promise<void> {
    try {
      const adminContributorId = await this.resolveSystemContributorId();
      if (!adminContributorId) return;

      await this.createActivityEvent({
        eventType: 'SPRINT_STARTED',
        title: `Sprint started: ${event.payload.sprintName}`,
        description: event.payload.committedPoints
          ? `${event.payload.committedPoints} points committed`
          : undefined,
        contributorId: adminContributorId,
        domain: 'Technology' as ContributorDomain,
        entityId: event.payload.sprintId,
        metadata: {
          sprintId: event.payload.sprintId,
          sprintName: event.payload.sprintName,
          committedPoints: event.payload.committedPoints,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to create sprint started activity event', {
        module: 'activity',
        sprintId: event.payload.sprintId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  @OnEvent('sprint.lifecycle.completed')
  async handleSprintCompleted(event: SprintActivityPayload): Promise<void> {
    try {
      const adminContributorId = await this.resolveSystemContributorId();
      if (!adminContributorId) return;

      await this.createActivityEvent({
        eventType: 'SPRINT_COMPLETED',
        title: `Sprint completed: ${event.payload.sprintName}`,
        description:
          event.payload.velocity != null
            ? `Velocity: ${event.payload.velocity} points (${event.payload.deliveredPoints ?? 0}/${event.payload.committedPoints ?? 0} delivered)`
            : undefined,
        contributorId: adminContributorId,
        domain: 'Technology' as ContributorDomain,
        entityId: event.payload.sprintId,
        metadata: {
          sprintId: event.payload.sprintId,
          sprintName: event.payload.sprintName,
          velocity: event.payload.velocity,
          committedPoints: event.payload.committedPoints,
          deliveredPoints: event.payload.deliveredPoints,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to create sprint completed activity event', {
        module: 'activity',
        sprintId: event.payload.sprintId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  @OnEvent('sprint.velocity.milestone')
  async handleVelocityMilestone(event: SprintActivityPayload): Promise<void> {
    try {
      const adminContributorId = await this.resolveSystemContributorId();
      if (!adminContributorId) return;

      const milestone = event.payload.milestonePercentage ?? 0;

      await this.createActivityEvent({
        eventType: 'SPRINT_VELOCITY_MILESTONE',
        title: `Velocity milestone: ${milestone}% of sprint goal reached`,
        description: `${event.payload.sprintName}: ${event.payload.deliveredPoints ?? 0}/${event.payload.committedPoints ?? 0} points delivered`,
        contributorId: adminContributorId,
        domain: 'Technology' as ContributorDomain,
        entityId: event.payload.sprintId,
        metadata: {
          sprintId: event.payload.sprintId,
          sprintName: event.payload.sprintName,
          milestonePercentage: milestone,
          velocity: event.payload.velocity,
          committedPoints: event.payload.committedPoints,
          deliveredPoints: event.payload.deliveredPoints,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to create velocity milestone activity event', {
        module: 'activity',
        sprintId: event.payload.sprintId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  private cachedAdminId: string | null | undefined = undefined;
  private cachedAdminIdExpiry = 0;

  private async resolveSystemContributorId(): Promise<string | null> {
    const now = Date.now();
    if (this.cachedAdminId !== undefined && now < this.cachedAdminIdExpiry) {
      return this.cachedAdminId;
    }

    const admin = await this.prisma.contributor.findFirst({
      where: { role: 'ADMIN' as never },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!admin) {
      this.logger.warn('No admin contributor found for sprint activity events', {
        module: 'activity',
      });
      this.cachedAdminId = null;
      this.cachedAdminIdExpiry = now + 60_000; // cache null for 1 min
      return null;
    }

    this.cachedAdminId = admin.id;
    this.cachedAdminIdExpiry = now + 300_000; // cache for 5 min
    return admin.id;
  }
}

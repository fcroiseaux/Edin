import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { OnEvent } from '@nestjs/event-emitter';
import type { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { NotificationType as PrismaNotificationType } from '../../../generated/prisma/client/enums.js';
import type {
  FeedbackAssignmentEvent,
  FeedbackSubmittedEvent,
  FeedbackReassignedEvent,
  EvaluationCompletedEvent,
  EvaluationReviewFlaggedEvent,
  EvaluationReviewResolvedEvent,
  EditorAssignedEvent,
  ArticleRevisionRequestedEvent,
  ArticleApprovedEvent,
  ArticlePublishedEvent,
  EditorApplicationSubmittedEvent,
  EditorApplicationReviewedEvent,
  EditorRoleRevokedEvent,
  RoleChangeEvent,
} from '@edin/shared';

export interface NotificationJobData {
  contributorId: string;
  type: PrismaNotificationType;
  title: string;
  description?: string;
  entityId: string;
  category: string;
  correlationId: string;
}

interface ContributionIngestedPayload {
  contributionId: string;
  contributionType: string;
  contributorId: string | null;
  repositoryId: string;
  correlationId: string;
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

interface NotificationQuery {
  cursor?: string;
  limit: number;
  category?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('notification') private readonly notificationQueue: Queue,
  ) {}

  async getNotifications(contributorId: string, query: NotificationQuery) {
    const { cursor, limit = 20, category } = query;

    const where: Record<string, unknown> = { contributorId };
    if (category) {
      where.category = category;
    }
    if (cursor) {
      const separatorIdx = cursor.lastIndexOf('|');
      if (separatorIdx > 0) {
        const cursorDate = cursor.slice(0, separatorIdx);
        const cursorId = cursor.slice(separatorIdx + 1);
        const parsedDate = new Date(cursorDate);
        if (isNaN(parsedDate.getTime())) {
          // Invalid cursor format — ignore and return from the beginning
          this.logger.warn('Invalid cursor format received', {
            module: 'notification',
            cursor,
          });
        } else {
          where.OR = [
            { createdAt: { lt: parsedDate } },
            { createdAt: parsedDate, id: { lt: cursorId } },
          ];
        }
      } else {
        const parsedDate = new Date(cursor);
        if (!isNaN(parsedDate.getTime())) {
          where.createdAt = { lt: parsedDate };
        }
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
      }),
      this.prisma.notification.count({
        where: { contributorId, ...(category ? { category } : {}) },
      }),
    ]);

    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;
    const lastItem = resultItems.length > 0 ? resultItems[resultItems.length - 1] : null;
    const nextCursor =
      hasMore && lastItem ? `${lastItem.createdAt.toISOString()}|${lastItem.id}` : null;

    const mapped = resultItems.map((item) => ({
      id: item.id,
      contributorId: item.contributorId,
      type: item.type,
      title: item.title,
      description: item.description,
      entityId: item.entityId,
      category: item.category,
      read: item.read,
      createdAt: item.createdAt.toISOString(),
      readAt: item.readAt?.toISOString() ?? null,
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

  async markAsRead(notificationId: string, contributorId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, contributorId },
    });

    if (!notification) {
      return null;
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { read: true, readAt: new Date() },
    });

    return {
      read: updated.read,
      readAt: updated.readAt?.toISOString() ?? null,
    };
  }

  async markAllAsRead(contributorId: string, category?: string) {
    const where: Record<string, unknown> = { contributorId, read: false };
    if (category) {
      where.category = category;
    }

    const result = await this.prisma.notification.updateMany({
      where,
      data: { read: true, readAt: new Date() },
    });

    return { count: result.count };
  }

  async getUnreadCounts(contributorId: string): Promise<Record<string, number>> {
    const counts = await this.prisma.notification.groupBy({
      by: ['category'],
      where: { contributorId, read: false },
      _count: { id: true },
    });

    const result: Record<string, number> = {};
    for (const group of counts) {
      result[group.category] = group._count.id;
    }

    return result;
  }

  async enqueueNotification(data: NotificationJobData): Promise<void> {
    await this.notificationQueue.add('send-notification', data, {
      removeOnComplete: true,
      removeOnFail: false,
    });

    this.logger.debug('Notification job enqueued', {
      module: 'notification',
      type: data.type,
      contributorId: data.contributorId,
      correlationId: data.correlationId,
    });
  }

  @OnEvent('working-group.announcement.created')
  async handleAnnouncementCreated(event: AnnouncementCreatedPayload): Promise<void> {
    try {
      const workingGroup = await this.prisma.workingGroup.findUnique({
        where: { id: event.payload.workingGroupId },
        select: { id: true, name: true },
      });

      if (!workingGroup) return;

      const members = await this.prisma.workingGroupMember.findMany({
        where: { workingGroupId: event.payload.workingGroupId },
        select: { contributorId: true },
      });

      const contentPreview = event.payload.content.slice(0, 100);

      // Use addBulk for efficient batch enqueue instead of sequential Redis calls
      const jobs = members
        .filter((member) => member.contributorId !== event.payload.authorId)
        .map((member) => ({
          name: 'send-notification',
          data: {
            contributorId: member.contributorId,
            type: 'ANNOUNCEMENT_POSTED' as const,
            title: `New announcement in ${workingGroup.name}`,
            description: contentPreview,
            entityId: event.payload.announcementId,
            category: 'working-groups',
            correlationId: event.correlationId,
          } satisfies NotificationJobData,
          opts: { removeOnComplete: true, removeOnFail: false },
        }));

      if (jobs.length > 0) {
        await this.notificationQueue.addBulk(jobs);

        this.logger.debug('Announcement notifications enqueued in bulk', {
          module: 'notification',
          workingGroupId: event.payload.workingGroupId,
          recipientCount: jobs.length,
          correlationId: event.correlationId,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to process announcement notification event', {
        module: 'notification',
        workingGroupId: event.payload.workingGroupId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  @OnEvent('contribution.commit.ingested')
  async handleCommitIngested(payload: ContributionIngestedPayload): Promise<void> {
    await this.notifyWgLeadOfContribution(payload);
  }

  @OnEvent('contribution.pull_request.ingested')
  async handlePrIngested(payload: ContributionIngestedPayload): Promise<void> {
    await this.notifyWgLeadOfContribution(payload);
  }

  @OnEvent('contribution.review.ingested')
  async handleReviewIngested(payload: ContributionIngestedPayload): Promise<void> {
    await this.notifyWgLeadOfContribution(payload);
  }

  @OnEvent('feedback.review.assigned')
  async handleFeedbackReviewAssigned(event: FeedbackAssignmentEvent): Promise<void> {
    try {
      const typeLabel =
        event.payload.contributionType === 'COMMIT'
          ? 'commit'
          : event.payload.contributionType === 'PULL_REQUEST'
            ? 'pull request'
            : 'code review';

      await this.enqueueNotification({
        contributorId: event.payload.reviewerId,
        type: 'PEER_FEEDBACK_AVAILABLE',
        title: "You've been asked to review a contribution",
        description: `Review ${typeLabel}: ${event.payload.contributionTitle}`,
        entityId: event.payload.peerFeedbackId,
        category: 'feedback',
        correlationId: event.correlationId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to process feedback review assigned notification', {
        module: 'notification',
        peerFeedbackId: event.payload.peerFeedbackId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  @OnEvent('feedback.review.submitted')
  async handleFeedbackReviewSubmitted(event: FeedbackSubmittedEvent): Promise<void> {
    try {
      const typeLabel =
        event.payload.contributionType === 'COMMIT'
          ? 'commit'
          : event.payload.contributionType === 'PULL_REQUEST'
            ? 'pull request'
            : 'code review';

      await this.enqueueNotification({
        contributorId: event.payload.contributorId,
        type: 'PEER_FEEDBACK_RECEIVED',
        title: "You've received feedback on your contribution",
        description: `Feedback on ${typeLabel}: ${event.payload.contributionTitle}`,
        entityId: event.payload.peerFeedbackId,
        category: 'feedback',
        correlationId: event.correlationId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to process feedback review submitted notification', {
        module: 'notification',
        peerFeedbackId: event.payload.peerFeedbackId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  @OnEvent('evaluation.score.completed')
  async handleEvaluationCompleted(event: EvaluationCompletedEvent): Promise<void> {
    try {
      const typeLabel =
        event.payload.contributionType === 'COMMIT'
          ? 'commit'
          : event.payload.contributionType === 'PULL_REQUEST'
            ? 'pull request'
            : 'code review';

      await this.enqueueNotification({
        contributorId: event.payload.contributorId,
        type: 'EVALUATION_COMPLETED',
        title: 'Your contribution has been evaluated',
        description: `${typeLabel}: ${event.payload.contributionTitle} — Score: ${event.payload.compositeScore}`,
        entityId: event.payload.evaluationId,
        category: 'evaluation',
        correlationId: event.correlationId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to process evaluation completed notification', {
        module: 'notification',
        evaluationId: event.payload.evaluationId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  @OnEvent('feedback.review.reassigned')
  async handleFeedbackReviewReassigned(event: FeedbackReassignedEvent): Promise<void> {
    try {
      const typeLabel =
        event.payload.contributionType === 'COMMIT'
          ? 'commit'
          : event.payload.contributionType === 'PULL_REQUEST'
            ? 'pull request'
            : 'code review';

      await this.enqueueNotification({
        contributorId: event.payload.newReviewerId,
        type: 'PEER_FEEDBACK_AVAILABLE',
        title: "You've been assigned to review a contribution",
        description: `Review ${typeLabel}: ${event.payload.contributionTitle}`,
        entityId: event.payload.newPeerFeedbackId,
        category: 'feedback',
        correlationId: event.correlationId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to process feedback review reassigned notification', {
        module: 'notification',
        peerFeedbackId: event.payload.peerFeedbackId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  @OnEvent('evaluation.review.flagged')
  async handleEvaluationReviewFlagged(event: EvaluationReviewFlaggedEvent): Promise<void> {
    try {
      // Notify all admins about the flagged evaluation
      const admins = await this.prisma.contributor.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { id: true },
      });

      if (admins.length === 0) return;

      const jobs: NotificationJobData[] = admins.map((admin) => ({
        contributorId: admin.id,
        type: 'EVALUATION_REVIEW_FLAGGED' as PrismaNotificationType,
        title: 'Evaluation flagged for human review',
        description: `A contributor has requested review of the evaluation for "${event.payload.contributionTitle}"`,
        entityId: event.payload.reviewId,
        category: 'evaluation',
        correlationId: event.correlationId,
      }));

      await this.notificationQueue.addBulk(
        jobs.map((job) => ({
          name: 'send-notification',
          data: job,
          opts: { removeOnComplete: true, removeOnFail: false },
        })),
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to process evaluation review flagged notification', {
        module: 'notification',
        reviewId: event.payload.reviewId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  @OnEvent('evaluation.review.resolved')
  async handleEvaluationReviewResolved(event: EvaluationReviewResolvedEvent): Promise<void> {
    try {
      const actionLabel =
        event.payload.action === 'confirm'
          ? 'confirmed — the original evaluation stands'
          : 'updated with revised scores';

      await this.enqueueNotification({
        contributorId: event.payload.contributorId,
        type: 'EVALUATION_REVIEW_RESOLVED' as PrismaNotificationType,
        title: 'Your evaluation review has been processed',
        description: `Your review request for "${event.payload.contributionTitle}" has been ${actionLabel}`,
        entityId: event.payload.reviewId,
        category: 'evaluation',
        correlationId: event.correlationId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to process evaluation review resolved notification', {
        module: 'notification',
        reviewId: event.payload.reviewId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  @OnEvent('publication.editor.assigned')
  async handleEditorAssigned(event: EditorAssignedEvent): Promise<void> {
    try {
      await this.enqueueNotification({
        contributorId: event.editorId,
        type: 'ARTICLE_FEEDBACK',
        title: 'New article assigned for review',
        description: `Article "${event.title}" needs your editorial review`,
        entityId: event.articleId,
        category: 'articles',
        correlationId: event.correlationId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to process editor assigned notification', {
        module: 'notification',
        articleId: event.articleId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  @OnEvent('publication.article.revision-requested')
  async handleArticleRevisionRequested(event: ArticleRevisionRequestedEvent): Promise<void> {
    try {
      await this.enqueueNotification({
        contributorId: event.authorId,
        type: 'ARTICLE_FEEDBACK',
        title: 'Editorial feedback available',
        description: `Your article "${event.title}" has received editorial feedback`,
        entityId: event.articleId,
        category: 'articles',
        correlationId: event.correlationId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to process article revision requested notification', {
        module: 'notification',
        articleId: event.articleId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  @OnEvent('publication.article.approved')
  async handleArticleApproved(event: ArticleApprovedEvent): Promise<void> {
    try {
      await this.enqueueNotification({
        contributorId: event.authorId,
        type: 'ARTICLE_FEEDBACK',
        title: 'Your article has been approved',
        description: `Article "${event.title}" has been approved for publication`,
        entityId: event.articleId,
        category: 'articles',
        correlationId: event.correlationId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to process article approved notification', {
        module: 'notification',
        articleId: event.articleId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  @OnEvent('publication.article.published')
  async handleArticlePublished(event: ArticlePublishedEvent): Promise<void> {
    try {
      // Notify author
      await this.enqueueNotification({
        contributorId: event.authorId,
        type: 'ARTICLE_PUBLISHED',
        title: 'Your article is now live',
        description: `Article "${event.title}" has been published on the platform`,
        entityId: event.articleId,
        category: 'articles',
        correlationId: event.correlationId,
      });

      // Notify editor if exists
      if (event.editorId) {
        await this.enqueueNotification({
          contributorId: event.editorId,
          type: 'ARTICLE_PUBLISHED',
          title: 'An article you edited is now live',
          description: `Article "${event.title}" has been published`,
          entityId: event.articleId,
          category: 'articles',
          correlationId: event.correlationId,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to process article published notification', {
        module: 'notification',
        articleId: event.articleId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  @OnEvent('publication.article.rejected')
  async handleArticleRejected(event: ArticleApprovedEvent): Promise<void> {
    try {
      await this.enqueueNotification({
        contributorId: event.authorId,
        type: 'ARTICLE_FEEDBACK',
        title: 'Your article has been rejected',
        description: `Article "${event.title}" did not meet editorial standards`,
        entityId: event.articleId,
        category: 'articles',
        correlationId: event.correlationId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to process article rejected notification', {
        module: 'notification',
        articleId: event.articleId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  @OnEvent('publication.editor.unavailable')
  async handleEditorUnavailable(event: {
    articleId: string;
    authorId: string;
    domain: string;
    title: string;
    correlationId: string;
  }): Promise<void> {
    try {
      const admins = await this.prisma.contributor.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { id: true },
      });

      if (admins.length === 0) return;

      const jobs = admins.map((admin) => ({
        name: 'send-notification',
        data: {
          contributorId: admin.id,
          type: 'ARTICLE_FEEDBACK' as PrismaNotificationType,
          title: 'No editor available for submitted article',
          description: `Article "${event.title}" (${event.domain}) needs an editor — none available`,
          entityId: event.articleId,
          category: 'articles',
          correlationId: event.correlationId,
        } satisfies NotificationJobData,
        opts: { removeOnComplete: true, removeOnFail: false },
      }));

      await this.notificationQueue.addBulk(jobs);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to process editor unavailable notification', {
        module: 'notification',
        articleId: event.articleId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  @OnEvent('publication.editor.application-submitted')
  async handleEditorApplicationSubmitted(event: EditorApplicationSubmittedEvent): Promise<void> {
    try {
      const admins = await this.prisma.contributor.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { id: true },
      });

      if (admins.length === 0) return;

      const jobs = admins.map((admin) => ({
        name: 'send-notification',
        data: {
          contributorId: admin.id,
          type: 'EDITOR_APPLICATION_SUBMITTED' as PrismaNotificationType,
          title: 'New editor application received',
          description: `${event.contributorName} applied to be an editor for ${event.domain}`,
          entityId: event.applicationId,
          category: 'editorial',
          correlationId: event.correlationId,
        } satisfies NotificationJobData,
        opts: { removeOnComplete: true, removeOnFail: false },
      }));

      await this.notificationQueue.addBulk(jobs);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to process editor application submitted notification', {
        module: 'notification',
        applicationId: event.applicationId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  @OnEvent('publication.editor.application-reviewed')
  async handleEditorApplicationReviewed(event: EditorApplicationReviewedEvent): Promise<void> {
    try {
      const decisionText = event.decision === 'APPROVED' ? 'approved' : 'rejected';
      await this.enqueueNotification({
        contributorId: event.contributorId,
        type: 'ARTICLE_FEEDBACK',
        title: `Your editor application has been ${decisionText}`,
        description: `Your application to be an editor for ${event.domain} has been ${decisionText}`,
        entityId: event.applicationId,
        category: 'editorial',
        correlationId: event.correlationId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to process editor application reviewed notification', {
        module: 'notification',
        applicationId: event.applicationId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  @OnEvent('publication.editor.role-revoked')
  async handleEditorRoleRevoked(event: EditorRoleRevokedEvent): Promise<void> {
    try {
      await this.enqueueNotification({
        contributorId: event.contributorId,
        type: 'ARTICLE_FEEDBACK',
        title: 'Your editor status has been revoked',
        description: `Your editor status for ${event.domain} has been revoked: ${event.reason}`,
        entityId: event.contributorId,
        category: 'editorial',
        correlationId: event.correlationId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to process editor role revoked notification', {
        module: 'notification',
        contributorId: event.contributorId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  private async notifyWgLeadOfContribution(payload: ContributionIngestedPayload): Promise<void> {
    try {
      if (!payload.contributorId) return;

      const contributor = await this.prisma.contributor.findUnique({
        where: { id: payload.contributorId },
        select: { domain: true },
      });

      if (!contributor?.domain) return;

      const workingGroup = await this.prisma.workingGroup.findFirst({
        where: { domain: contributor.domain },
        select: { leadContributorId: true, name: true },
      });

      if (!workingGroup?.leadContributorId) return;

      // Self-notification prevention: skip if contributor is the lead
      if (workingGroup.leadContributorId === payload.contributorId) return;

      const contribution = await this.prisma.contribution.findUnique({
        where: { id: payload.contributionId },
        select: { title: true, contributionType: true },
      });

      const typeLabel =
        payload.contributionType === 'COMMIT'
          ? 'commit'
          : payload.contributionType === 'PULL_REQUEST'
            ? 'pull request'
            : 'code review';

      await this.enqueueNotification({
        contributorId: workingGroup.leadContributorId,
        type: 'CONTRIBUTION_TO_DOMAIN',
        title: `New ${typeLabel} in ${workingGroup.name}`,
        description: contribution?.title?.slice(0, 100),
        entityId: payload.contributionId,
        category: 'working-groups',
        correlationId: payload.correlationId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to process contribution notification event', {
        module: 'notification',
        contributionId: payload.contributionId,
        correlationId: payload.correlationId,
        error: message,
      });
    }
  }

  @OnEvent('contributor.role.changed')
  async handleRoleChanged(event: RoleChangeEvent): Promise<void> {
    try {
      await this.enqueueNotification({
        contributorId: event.payload.contributorId,
        type: 'ROLE_CHANGED',
        title: 'Your role has been updated',
        description: `Your role has been changed from ${event.payload.oldRole} to ${event.payload.newRole}`,
        entityId: event.payload.contributorId,
        category: 'account',
        correlationId: event.correlationId ?? '',
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to process role change notification', {
        module: 'notification',
        contributorId: event.payload.contributorId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }
}

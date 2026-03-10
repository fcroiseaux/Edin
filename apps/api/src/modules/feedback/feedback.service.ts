import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Queue } from 'bullmq';
import { ERROR_CODES, MIN_COMMENT_LENGTH, RUBRIC_VERSION, RUBRIC_QUESTIONS } from '@edin/shared';
import type {
  FeedbackSubmissionDto,
  RubricData,
  FeedbackMetricsDto,
  OverdueReviewDto,
  EligibleReviewerDto,
} from '@edin/shared';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { AuditService } from '../compliance/audit/audit.service.js';
import { Prisma } from '../../../generated/prisma/client/client.js';
import type { ContributorDomain } from '../../../generated/prisma/client/client.js';

export interface FeedbackAssignmentJobData {
  contributionId: string;
  contributorId: string;
  contributorDomain: string | null;
  contributionTitle: string;
  contributionType: string;
  correlationId: string;
}

interface ContributionIngestedPayload {
  contributionId: string;
  contributionType: string;
  contributorId: string | null;
  repositoryId: string;
  correlationId: string;
}

interface FeedbackQuery {
  cursor?: string;
  limit: number;
  status?: string;
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('feedback-assignment') private readonly feedbackQueue: Queue,
    private readonly auditService: AuditService,
  ) {}

  async assignReviewer(
    contributionId: string,
    correlationId?: string,
  ): Promise<{ peerFeedbackId: string; reviewerId: string } | null> {
    const contribution = await this.prisma.contribution.findUnique({
      where: { id: contributionId },
      include: {
        contributor: { select: { id: true, domain: true } },
      },
    });

    if (!contribution || !contribution.contributorId || !contribution.contributor) {
      this.logger.warn('Cannot assign reviewer: contribution not found or unattributed', {
        module: 'feedback',
        contributionId,
        correlationId,
      });
      return null;
    }

    const reviewer = await this.selectReviewer(
      contributionId,
      contribution.contributor.domain,
      contribution.contributorId,
    );

    if (!reviewer) {
      this.logger.warn('No eligible reviewer found for contribution', {
        module: 'feedback',
        contributionId,
        contributorDomain: contribution.contributor.domain,
        correlationId,
      });
      return null;
    }

    const peerFeedback = await this.prisma.$transaction(async (tx) => {
      const feedback = await tx.peerFeedback.create({
        data: {
          contributionId,
          reviewerId: reviewer.id,
          status: 'ASSIGNED',
        },
      });

      await this.auditService.log(
        {
          actorId: null,
          action: 'FEEDBACK_AUTO_ASSIGNED',
          entityType: 'PeerFeedback',
          entityId: feedback.id,
          details: {
            contributionId,
            reviewerId: reviewer.id,
            contributorDomain: contribution.contributor!.domain,
          },
          correlationId: correlationId ?? null,
        },
        tx,
      );

      return feedback;
    });

    this.eventEmitter.emit('feedback.review.assigned', {
      eventType: 'feedback.review.assigned',
      timestamp: new Date().toISOString(),
      correlationId: correlationId ?? null,
      actorId: 'system',
      payload: {
        peerFeedbackId: peerFeedback.id,
        contributionId,
        reviewerId: reviewer.id,
        contributionTitle: contribution.title,
        contributionType: contribution.contributionType,
        domain: contribution.contributor.domain ?? 'Technology',
      },
    });

    this.logger.log('Peer reviewer assigned to contribution', {
      module: 'feedback',
      peerFeedbackId: peerFeedback.id,
      contributionId,
      reviewerId: reviewer.id,
      correlationId,
    });

    return { peerFeedbackId: peerFeedback.id, reviewerId: reviewer.id };
  }

  async adminAssignReviewer(
    contributionId: string,
    reviewerId: string,
    adminId: string,
    correlationId?: string,
  ): Promise<{ peerFeedbackId: string; reviewerId: string }> {
    const contribution = await this.prisma.contribution.findUnique({
      where: { id: contributionId },
      include: {
        contributor: { select: { id: true, domain: true } },
      },
    });

    if (!contribution) {
      throw new DomainException(
        ERROR_CODES.FEEDBACK_NOT_FOUND,
        'Contribution not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const peerFeedback = await this.prisma.$transaction(async (tx) => {
      const feedback = await tx.peerFeedback.create({
        data: {
          contributionId,
          reviewerId,
          status: 'ASSIGNED',
          assignedBy: adminId,
        },
      });

      await this.auditService.log(
        {
          actorId: adminId,
          action: 'FEEDBACK_ADMIN_ASSIGNED',
          entityType: 'PeerFeedback',
          entityId: feedback.id,
          details: {
            contributionId,
            reviewerId,
            assignedBy: adminId,
          },
          correlationId: correlationId ?? null,
        },
        tx,
      );

      return feedback;
    });

    this.eventEmitter.emit('feedback.review.assigned', {
      eventType: 'feedback.review.assigned',
      timestamp: new Date().toISOString(),
      correlationId: correlationId ?? null,
      actorId: adminId,
      payload: {
        peerFeedbackId: peerFeedback.id,
        contributionId,
        reviewerId,
        contributionTitle: contribution.title,
        contributionType: contribution.contributionType,
        domain: contribution.contributor?.domain ?? 'Technology',
      },
    });

    this.logger.log('Admin assigned peer reviewer to contribution', {
      module: 'feedback',
      peerFeedbackId: peerFeedback.id,
      contributionId,
      reviewerId,
      adminId,
      correlationId,
    });

    return { peerFeedbackId: peerFeedback.id, reviewerId };
  }

  async getAssignmentsForReviewer(reviewerId: string, query?: FeedbackQuery) {
    const { cursor, limit = 20, status } = query ?? {};

    const where: Record<string, unknown> = { reviewerId };
    if (status) {
      where.status = status;
    }
    if (cursor) {
      const separatorIdx = cursor.lastIndexOf('|');
      if (separatorIdx > 0) {
        const cursorDate = cursor.slice(0, separatorIdx);
        const cursorId = cursor.slice(separatorIdx + 1);
        const parsedDate = new Date(cursorDate);
        if (!isNaN(parsedDate.getTime())) {
          where.OR = [
            { assignedAt: { lt: parsedDate } },
            { assignedAt: parsedDate, id: { lt: cursorId } },
          ];
        }
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.peerFeedback.findMany({
        where,
        orderBy: [{ assignedAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        include: {
          contribution: {
            select: {
              id: true,
              title: true,
              contributionType: true,
            },
          },
        },
      }),
      this.prisma.peerFeedback.count({
        where: { reviewerId, ...(status ? { status: status as never } : {}) },
      }),
    ]);

    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;
    const lastItem = resultItems.length > 0 ? resultItems[resultItems.length - 1] : null;
    const nextCursor =
      hasMore && lastItem ? `${lastItem.assignedAt.toISOString()}|${lastItem.id}` : null;

    const mapped = resultItems.map((item) => ({
      id: item.id,
      contributionId: item.contributionId,
      reviewerId: item.reviewerId,
      status: item.status,
      assignedBy: item.assignedBy,
      assignedAt: item.assignedAt.toISOString(),
      submittedAt: item.submittedAt?.toISOString() ?? null,
      contributionTitle: item.contribution.title,
      contributionType: item.contribution.contributionType,
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

  async submitFeedback(
    feedbackId: string,
    submission: FeedbackSubmissionDto,
    reviewerId: string,
    correlationId?: string,
  ) {
    const feedback = await this.prisma.peerFeedback.findUnique({
      where: { id: feedbackId },
      include: {
        contribution: {
          select: {
            id: true,
            title: true,
            contributionType: true,
            contributorId: true,
            contributor: { select: { domain: true } },
          },
        },
      },
    });

    if (!feedback) {
      throw new DomainException(
        ERROR_CODES.FEEDBACK_NOT_FOUND,
        'Feedback assignment not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (feedback.reviewerId !== reviewerId) {
      throw new DomainException(
        ERROR_CODES.FEEDBACK_ACCESS_DENIED,
        'You are not the assigned reviewer for this feedback',
        HttpStatus.FORBIDDEN,
      );
    }

    if (feedback.status === 'COMPLETED') {
      throw new DomainException(
        ERROR_CODES.FEEDBACK_ALREADY_SUBMITTED,
        'Feedback has already been submitted',
        HttpStatus.CONFLICT,
      );
    }

    if (feedback.status !== 'ASSIGNED') {
      throw new DomainException(
        ERROR_CODES.FEEDBACK_INVALID_STATUS,
        `Cannot submit feedback with status ${feedback.status}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate all required rubric questions are answered
    const requiredQuestions = RUBRIC_QUESTIONS.filter((q) =>
      q.contributionTypes.includes(feedback.contribution.contributionType as never),
    );
    const submittedIds = new Set(submission.responses.map((r) => r.questionId));
    const missingQuestions = requiredQuestions.filter((q) => !submittedIds.has(q.id));

    if (missingQuestions.length > 0) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        `Missing responses for questions: ${missingQuestions.map((q) => q.id).join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // Validate all rubric responses meet minimum comment length
    for (const response of submission.responses) {
      if (response.comment.length < MIN_COMMENT_LENGTH) {
        throw new DomainException(
          ERROR_CODES.VALIDATION_ERROR,
          `Comment for question ${response.questionId} must be at least ${MIN_COMMENT_LENGTH} characters`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const rubricData: RubricData = {
      rubricVersion: RUBRIC_VERSION,
      responses: submission.responses,
    };

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.peerFeedback.update({
        where: { id: feedbackId },
        data: {
          status: 'COMPLETED',
          ratings: rubricData as never,
          comments: submission.overallComment ?? null,
          submittedAt: new Date(),
        },
      });

      await this.auditService.log(
        {
          actorId: reviewerId,
          action: 'FEEDBACK_SUBMITTED',
          entityType: 'PeerFeedback',
          entityId: feedbackId,
          details: {
            contributionId: feedback.contributionId,
            reviewerId,
            rubricVersion: RUBRIC_VERSION,
            responseCount: submission.responses.length,
          },
          correlationId: correlationId ?? null,
        },
        tx,
      );

      return result;
    });

    this.eventEmitter.emit('feedback.review.submitted', {
      eventType: 'feedback.review.submitted',
      timestamp: new Date().toISOString(),
      correlationId: correlationId ?? null,
      actorId: reviewerId,
      payload: {
        peerFeedbackId: feedbackId,
        contributionId: feedback.contributionId,
        reviewerId,
        contributorId: feedback.contribution.contributorId,
        contributionTitle: feedback.contribution.title,
        contributionType: feedback.contribution.contributionType,
        domain: feedback.contribution.contributor?.domain ?? 'Technology',
      },
    });

    this.logger.log('Feedback submitted for contribution', {
      module: 'feedback',
      peerFeedbackId: feedbackId,
      contributionId: feedback.contributionId,
      reviewerId,
      correlationId,
    });

    return updated;
  }

  async getAssignmentById(feedbackId: string, reviewerId: string) {
    const feedback = await this.prisma.peerFeedback.findUnique({
      where: { id: feedbackId },
      include: {
        contribution: {
          select: {
            id: true,
            title: true,
            description: true,
            contributionType: true,
            contributorId: true,
            contributor: { select: { name: true, domain: true } },
          },
        },
      },
    });

    if (!feedback) {
      throw new DomainException(
        ERROR_CODES.FEEDBACK_NOT_FOUND,
        'Feedback assignment not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (feedback.reviewerId !== reviewerId) {
      throw new DomainException(
        ERROR_CODES.FEEDBACK_ACCESS_DENIED,
        'You are not the assigned reviewer for this feedback',
        HttpStatus.FORBIDDEN,
      );
    }

    return {
      id: feedback.id,
      contributionId: feedback.contributionId,
      reviewerId: feedback.reviewerId,
      status: feedback.status,
      ratings: feedback.ratings,
      comments: feedback.comments,
      assignedBy: feedback.assignedBy,
      assignedAt: feedback.assignedAt.toISOString(),
      submittedAt: feedback.submittedAt?.toISOString() ?? null,
      contribution: {
        id: feedback.contribution.id,
        title: feedback.contribution.title,
        description: feedback.contribution.description,
        contributionType: feedback.contribution.contributionType,
      },
      contributorName: feedback.contribution.contributor?.name ?? null,
      contributorDomain: feedback.contribution.contributor?.domain ?? null,
    };
  }

  async getReceivedFeedback(contributorId: string, query?: FeedbackQuery) {
    const { cursor, limit = 20 } = query ?? {};

    const where: Record<string, unknown> = {
      contribution: { contributorId },
      status: 'COMPLETED',
    };

    if (cursor) {
      const separatorIdx = cursor.lastIndexOf('|');
      if (separatorIdx > 0) {
        const cursorDate = cursor.slice(0, separatorIdx);
        const cursorId = cursor.slice(separatorIdx + 1);
        const parsedDate = new Date(cursorDate);
        if (!isNaN(parsedDate.getTime())) {
          where.OR = [
            { submittedAt: { lt: parsedDate } },
            { submittedAt: parsedDate, id: { lt: cursorId } },
          ];
        }
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.peerFeedback.findMany({
        where,
        orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        include: {
          reviewer: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              domain: true,
            },
          },
          contribution: {
            select: {
              id: true,
              title: true,
              contributionType: true,
            },
          },
        },
      }),
      this.prisma.peerFeedback.count({
        where: { contribution: { contributorId }, status: 'COMPLETED' },
      }),
    ]);

    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;
    const lastItem = resultItems.length > 0 ? resultItems[resultItems.length - 1] : null;
    const nextCursor =
      hasMore && lastItem?.submittedAt
        ? `${lastItem.submittedAt.toISOString()}|${lastItem.id}`
        : null;

    const mapped = resultItems.map((item) => ({
      id: item.id,
      contributionId: item.contributionId,
      reviewerId: item.reviewerId,
      status: item.status,
      ratings: item.ratings as RubricData | null,
      comments: item.comments,
      submittedAt: item.submittedAt?.toISOString() ?? null,
      contribution: {
        id: item.contribution.id,
        title: item.contribution.title,
        contributionType: item.contribution.contributionType,
      },
      reviewer: {
        id: item.reviewer.id,
        name: item.reviewer.name,
        avatarUrl: item.reviewer.avatarUrl,
        domain: item.reviewer.domain,
      },
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

  async getAssignmentsForContribution(contributionId: string, reviewerId?: string) {
    const where: Record<string, unknown> = { contributionId };
    if (reviewerId) {
      where.reviewerId = reviewerId;
    }

    const items = await this.prisma.peerFeedback.findMany({
      where,
      orderBy: { assignedAt: 'desc' },
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return items.map((item) => ({
      id: item.id,
      contributionId: item.contributionId,
      reviewerId: item.reviewerId,
      reviewerName: item.reviewer.name,
      reviewerAvatarUrl: item.reviewer.avatarUrl,
      status: item.status,
      assignedBy: item.assignedBy,
      assignedAt: item.assignedAt.toISOString(),
      submittedAt: item.submittedAt?.toISOString() ?? null,
    }));
  }

  @OnEvent('contribution.commit.ingested')
  async handleCommitIngested(payload: ContributionIngestedPayload): Promise<void> {
    await this.dispatchAssignment(payload);
  }

  @OnEvent('contribution.pull_request.ingested')
  async handlePrIngested(payload: ContributionIngestedPayload): Promise<void> {
    await this.dispatchAssignment(payload);
  }

  @OnEvent('contribution.review.ingested')
  async handleReviewIngested(payload: ContributionIngestedPayload): Promise<void> {
    await this.dispatchAssignment(payload);
  }

  private async dispatchAssignment(payload: ContributionIngestedPayload): Promise<void> {
    try {
      if (!payload.contributorId) {
        this.logger.debug('Skipping feedback assignment for unattributed contribution', {
          module: 'feedback',
          contributionId: payload.contributionId,
        });
        return;
      }

      const contribution = await this.prisma.contribution.findUnique({
        where: { id: payload.contributionId },
        select: {
          title: true,
          contributor: { select: { domain: true } },
        },
      });

      const jobData: FeedbackAssignmentJobData = {
        contributionId: payload.contributionId,
        contributorId: payload.contributorId,
        contributorDomain: contribution?.contributor?.domain ?? null,
        contributionTitle: contribution?.title ?? 'Unknown',
        contributionType: payload.contributionType,
        correlationId: payload.correlationId,
      };

      await this.feedbackQueue.add('assign-reviewer', jobData, {
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.logger.debug('Feedback assignment job dispatched', {
        module: 'feedback',
        contributionId: payload.contributionId,
        correlationId: payload.correlationId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to dispatch feedback assignment job', {
        module: 'feedback',
        contributionId: payload.contributionId,
        correlationId: payload.correlationId,
        error: message,
      });
    }
  }

  private async selectReviewer(
    contributionId: string,
    contributorDomain: ContributorDomain | null,
    contributorId: string,
  ): Promise<{ id: string } | null> {
    // 1. Find eligible candidates: active contributors with relevant roles
    const candidates = await this.prisma.contributor.findMany({
      where: {
        role: { in: ['CONTRIBUTOR', 'FOUNDING_CONTRIBUTOR', 'WORKING_GROUP_LEAD', 'EDITOR'] },
        isActive: true,
        id: { not: contributorId },
        NOT: {
          peerFeedbacksGiven: {
            some: { contributionId },
          },
        },
      },
      select: { id: true, domain: true },
    });

    if (candidates.length === 0) return null;

    // 2. Prefer domain-matching candidates
    let filtered = candidates;
    if (contributorDomain) {
      const domainCandidates = candidates.filter((c) => c.domain === contributorDomain);
      if (domainCandidates.length > 0) {
        filtered = domainCandidates;
      }
    }

    // 3. Count pending reviews per candidate
    const reviewCounts = await this.prisma.peerFeedback.groupBy({
      by: ['reviewerId'],
      where: {
        reviewerId: { in: filtered.map((c) => c.id) },
        status: 'ASSIGNED',
      },
      _count: { id: true },
    });

    const countMap = new Map(reviewCounts.map((rc) => [rc.reviewerId, rc._count.id]));

    // 4. Find minimum load
    const candidatesWithLoad = filtered.map((c) => ({
      id: c.id,
      pendingCount: countMap.get(c.id) ?? 0,
    }));

    const minLoad = Math.min(...candidatesWithLoad.map((c) => c.pendingCount));
    const tiedCandidates = candidatesWithLoad.filter((c) => c.pendingCount === minLoad);

    // 5. Random selection among tied candidates (collusion prevention)
    const randomIndex = Math.floor(Math.random() * tiedCandidates.length);
    return { id: tiedCandidates[randomIndex].id };
  }

  async getFeedbackMetrics(slaHours: number): Promise<FeedbackMetricsDto> {
    const [pendingCount, totalAssigned, totalCompleted, overdueCount] = await Promise.all([
      this.prisma.peerFeedback.count({ where: { status: 'ASSIGNED' } }),
      this.prisma.peerFeedback.count({
        where: { status: { in: ['ASSIGNED', 'COMPLETED', 'REASSIGNED'] } },
      }),
      this.prisma.peerFeedback.count({ where: { status: 'COMPLETED' } }),
      this.prisma.peerFeedback.count({
        where: {
          status: 'ASSIGNED',
          assignedAt: { lt: new Date(Date.now() - slaHours * 3600_000) },
        },
      }),
    ]);

    const completionRate = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 0;

    // Average turnaround (raw SQL for date arithmetic)
    const avgResult = await this.prisma.$queryRaw<[{ avg_hours: number | null }]>`
      SELECT EXTRACT(EPOCH FROM AVG(submitted_at - assigned_at)) / 3600 AS avg_hours
      FROM core.peer_feedbacks
      WHERE status = 'COMPLETED'
        AND submitted_at IS NOT NULL
    `;
    const avgTurnaroundHours = avgResult[0]?.avg_hours ?? 0;

    // Rubric coverage (service layer computation)
    const completedWithRatings = await this.prisma.peerFeedback.findMany({
      where: { status: 'COMPLETED', ratings: { not: Prisma.DbNull } },
      select: { ratings: true },
      take: 1000,
      orderBy: { submittedAt: 'desc' },
    });

    let rubricCoverageRate = 0;
    if (completedWithRatings.length > 0) {
      let totalResponses = 0;
      let substantiveResponses = 0;

      for (const feedback of completedWithRatings) {
        const ratings = feedback.ratings as { responses?: { comment?: string }[] } | null;
        if (ratings?.responses) {
          for (const response of ratings.responses) {
            totalResponses++;
            if (response.comment && response.comment.length >= MIN_COMMENT_LENGTH) {
              substantiveResponses++;
            }
          }
        }
      }

      rubricCoverageRate = totalResponses > 0 ? (substantiveResponses / totalResponses) * 100 : 0;
    }

    const metrics: FeedbackMetricsDto = {
      pendingCount,
      avgTurnaroundHours: Number(avgTurnaroundHours),
      completionRate,
      overdueCount,
      rubricCoverageRate,
      totalAssigned,
      totalCompleted,
    };

    this.logger.log('Feedback metrics computed', { module: 'feedback', ...metrics });

    return metrics;
  }

  async getOverdueReviews(slaHours: number, query?: FeedbackQuery) {
    const { cursor, limit = 20 } = query ?? {};
    const slaThreshold = new Date(Date.now() - slaHours * 3600_000);

    const baseFilter = {
      status: 'ASSIGNED' as const,
      assignedAt: { lt: slaThreshold },
    };

    let where: Record<string, unknown> = baseFilter;

    if (cursor) {
      const separatorIdx = cursor.lastIndexOf('|');
      if (separatorIdx > 0) {
        const cursorDate = cursor.slice(0, separatorIdx);
        const cursorId = cursor.slice(separatorIdx + 1);
        const parsedDate = new Date(cursorDate);
        if (!isNaN(parsedDate.getTime())) {
          where = {
            AND: [
              baseFilter,
              {
                OR: [
                  { assignedAt: { gt: parsedDate } },
                  { assignedAt: parsedDate, id: { gt: cursorId } },
                ],
              },
            ],
          };
        }
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.peerFeedback.findMany({
        where,
        orderBy: [{ assignedAt: 'asc' }, { id: 'asc' }],
        take: limit + 1,
        include: {
          reviewer: {
            select: { id: true, name: true, avatarUrl: true },
          },
          contribution: {
            select: {
              id: true,
              title: true,
              contributionType: true,
              contributor: { select: { domain: true } },
            },
          },
        },
      }),
      this.prisma.peerFeedback.count({ where: baseFilter }),
    ]);

    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;
    const lastItem = resultItems.length > 0 ? resultItems[resultItems.length - 1] : null;
    const nextCursor =
      hasMore && lastItem ? `${lastItem.assignedAt.toISOString()}|${lastItem.id}` : null;

    const now = Date.now();
    const mapped: OverdueReviewDto[] = resultItems.map((item) => ({
      id: item.id,
      reviewerId: item.reviewer.id,
      reviewerName: item.reviewer.name,
      reviewerAvatarUrl: item.reviewer.avatarUrl,
      contributionId: item.contribution.id,
      contributionTitle: item.contribution.title,
      contributionType: item.contribution.contributionType,
      domain: item.contribution.contributor?.domain ?? 'Technology',
      assignedAt: item.assignedAt.toISOString(),
      hoursElapsed: Math.round(((now - item.assignedAt.getTime()) / 3600_000) * 10) / 10,
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

  async reassignFeedback(
    feedbackId: string,
    newReviewerId: string,
    reason: string,
    adminId: string,
    correlationId?: string,
  ) {
    const feedback = await this.prisma.peerFeedback.findUnique({
      where: { id: feedbackId },
      include: {
        contribution: {
          select: {
            id: true,
            title: true,
            contributionType: true,
            contributorId: true,
            contributor: { select: { domain: true } },
          },
        },
      },
    });

    if (!feedback) {
      throw new DomainException(
        ERROR_CODES.FEEDBACK_NOT_FOUND,
        'Feedback assignment not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (feedback.status !== 'ASSIGNED') {
      throw new DomainException(
        ERROR_CODES.FEEDBACK_INVALID_STATUS,
        `Cannot reassign feedback with status ${feedback.status}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (newReviewerId === feedback.reviewerId) {
      throw new DomainException(
        ERROR_CODES.FEEDBACK_REASSIGN_SAME_REVIEWER,
        'Cannot reassign to the same reviewer',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (newReviewerId === feedback.contribution.contributorId) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Cannot assign reviewer who is the contribution author',
        HttpStatus.BAD_REQUEST,
      );
    }

    const newReviewer = await this.prisma.contributor.findUnique({
      where: { id: newReviewerId },
      select: { id: true, isActive: true, role: true },
    });

    if (!newReviewer || !newReviewer.isActive) {
      throw new DomainException(
        ERROR_CODES.CONTRIBUTOR_NOT_FOUND,
        'New reviewer not found or inactive',
        HttpStatus.BAD_REQUEST,
      );
    }

    const eligibleRoles = ['CONTRIBUTOR', 'FOUNDING_CONTRIBUTOR', 'WORKING_GROUP_LEAD', 'EDITOR'];
    if (!eligibleRoles.includes(newReviewer.role)) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Reviewer does not have an eligible role for peer review',
        HttpStatus.BAD_REQUEST,
      );
    }

    let result: { oldFeedbackId: string; newPeerFeedbackId: string; newReviewerId: string };
    try {
      result = await this.prisma.$transaction(async (tx) => {
        await tx.peerFeedback.update({
          where: { id: feedbackId },
          data: {
            status: 'REASSIGNED',
            reassignedAt: new Date(),
            reassignReason: reason,
          },
        });

        const newFeedback = await tx.peerFeedback.create({
          data: {
            contributionId: feedback.contributionId,
            reviewerId: newReviewerId,
            status: 'ASSIGNED',
            assignedBy: adminId,
          },
        });

        await this.auditService.log(
          {
            actorId: adminId,
            action: 'FEEDBACK_REASSIGNED',
            entityType: 'PeerFeedback',
            entityId: feedbackId,
            details: {
              oldReviewerId: feedback.reviewerId,
              newReviewerId,
              newPeerFeedbackId: newFeedback.id,
              reason,
              contributionId: feedback.contributionId,
            },
            correlationId: correlationId ?? null,
          },
          tx,
        );

        return { oldFeedbackId: feedbackId, newPeerFeedbackId: newFeedback.id, newReviewerId };
      });
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2002') {
        throw new DomainException(
          ERROR_CODES.FEEDBACK_ALREADY_ASSIGNED,
          'This reviewer has already been assigned to this contribution',
          HttpStatus.CONFLICT,
        );
      }
      throw err;
    }

    this.eventEmitter.emit('feedback.review.reassigned', {
      eventType: 'feedback.review.reassigned',
      timestamp: new Date().toISOString(),
      correlationId: correlationId ?? null,
      actorId: adminId,
      payload: {
        peerFeedbackId: feedbackId,
        oldReviewerId: feedback.reviewerId,
        newReviewerId,
        newPeerFeedbackId: result.newPeerFeedbackId,
        contributionId: feedback.contributionId,
        contributionTitle: feedback.contribution.title,
        contributionType: feedback.contribution.contributionType,
        domain: feedback.contribution.contributor?.domain ?? 'Technology',
        reason,
      },
    });

    this.logger.log('Feedback reassigned', {
      module: 'feedback',
      feedbackId,
      oldReviewerId: feedback.reviewerId,
      newReviewerId,
      adminId,
      correlationId,
    });

    return result;
  }

  async getEligibleReviewers(feedbackId: string): Promise<EligibleReviewerDto[]> {
    const feedback = await this.prisma.peerFeedback.findUnique({
      where: { id: feedbackId },
      include: {
        contribution: {
          select: {
            contributorId: true,
            contributor: { select: { domain: true } },
          },
        },
      },
    });

    if (!feedback) {
      throw new DomainException(
        ERROR_CODES.FEEDBACK_NOT_FOUND,
        'Feedback assignment not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const candidates = await this.prisma.contributor.findMany({
      where: {
        id: {
          notIn: [feedback.contribution.contributorId, feedback.reviewerId].filter(
            (id): id is string => id != null,
          ),
        },
        isActive: true,
        NOT: {
          peerFeedbacksGiven: {
            some: { contributionId: feedback.contributionId },
          },
        },
      },
      select: { id: true, name: true, avatarUrl: true, domain: true },
    });

    const reviewCounts = await this.prisma.peerFeedback.groupBy({
      by: ['reviewerId'],
      where: {
        reviewerId: { in: candidates.map((c) => c.id) },
        status: 'ASSIGNED',
      },
      _count: { id: true },
    });

    const countMap = new Map(reviewCounts.map((rc) => [rc.reviewerId, rc._count.id]));
    const contributorDomain = feedback.contribution.contributor?.domain;

    const withCounts = candidates.map((c) => ({
      id: c.id,
      name: c.name,
      avatarUrl: c.avatarUrl,
      domain: c.domain ?? 'Technology',
      pendingReviewCount: countMap.get(c.id) ?? 0,
    }));

    // Sort: same domain first, then lowest pending count
    withCounts.sort((a, b) => {
      const aDomain = a.domain === contributorDomain ? 0 : 1;
      const bDomain = b.domain === contributorDomain ? 0 : 1;
      if (aDomain !== bDomain) return aDomain - bDomain;
      return a.pendingReviewCount - b.pendingReviewCount;
    });

    return withCounts.slice(0, 20);
  }
}

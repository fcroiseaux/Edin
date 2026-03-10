import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../compliance/audit/audit.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ERROR_CODES } from '@edin/shared';
import type {
  ArticleSubmittedEvent,
  ArticleModerationCompletedEvent,
  ModerationReportDto,
  FlaggedArticleDto,
  FlaggedPassage,
} from '@edin/shared';

export interface PlagiarismCheckJobData {
  articleId: string;
  authorId: string;
  domain: string;
  title: string;
  body: string;
  correlationId: string;
}

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('plagiarism-check')
    private readonly plagiarismCheckQueue: Queue,
  ) {}

  // ─── Event Handlers ──────────────────────────────────────────────────────────

  @OnEvent('publication.article.submitted')
  async handleArticleSubmitted(event: ArticleSubmittedEvent): Promise<void> {
    try {
      await this.enqueuePlagiarismCheck(event.articleId, event.correlationId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to enqueue plagiarism check after article submission', {
        module: 'publication',
        articleId: event.articleId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  @OnEvent('publication.moderation.completed')
  async handleModerationCompleted(event: ArticleModerationCompletedEvent): Promise<void> {
    if (event.isFlagged) {
      this.logger.log('Article flagged for moderation review', {
        module: 'publication',
        articleId: event.articleId,
        flagType: event.flagType,
        plagiarismScore: event.plagiarismScore,
        aiContentScore: event.aiContentScore,
        correlationId: event.correlationId,
      });

      // Emit notification event for admin
      this.eventEmitter.emit('notification.enqueue', {
        type: 'MODERATION_FLAG',
        title: 'Article flagged for moderation',
        description: `An article requires moderation review (${event.flagType})`,
        entityId: event.articleId,
        category: 'ADMIN',
        correlationId: event.correlationId,
      });
    } else {
      this.logger.log('Article passed moderation, clearing for editorial review', {
        module: 'publication',
        articleId: event.articleId,
        correlationId: event.correlationId,
      });

      const article = await this.prisma.article.findUnique({
        where: { id: event.articleId },
        select: { domain: true, title: true, authorId: true },
      });

      if (article) {
        this.eventEmitter.emit('publication.article.moderation.cleared', {
          articleId: event.articleId,
          authorId: event.authorId,
          domain: article.domain,
          title: article.title,
          timestamp: new Date().toISOString(),
          correlationId: event.correlationId,
        });
      }
    }
  }

  // ─── Core Methods ─────────────────────────────────────────────────────────

  async enqueuePlagiarismCheck(articleId: string, correlationId: string): Promise<void> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, authorId: true, domain: true, title: true, body: true },
    });

    if (!article) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_FOUND,
        `Article ${articleId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Create pending moderation report
    await this.prisma.moderationReport.create({
      data: {
        articleId,
        status: 'PENDING',
      },
    });

    const jobData: PlagiarismCheckJobData = {
      articleId: article.id,
      authorId: article.authorId,
      domain: article.domain,
      title: article.title,
      body: article.body,
      correlationId,
    };

    await this.plagiarismCheckQueue.add('plagiarism-check', jobData);

    this.logger.log('Plagiarism check enqueued', {
      module: 'publication',
      articleId,
      correlationId,
    });
  }

  // ─── Query Methods ────────────────────────────────────────────────────────

  async getModerationReport(articleId: string): Promise<ModerationReportDto | null> {
    const report = await this.prisma.moderationReport.findFirst({
      where: { articleId },
      orderBy: { createdAt: 'desc' },
    });

    if (!report) return null;

    return this.toModerationReportDto(report);
  }

  async getFlaggedArticles(
    cursor?: string,
    limit = 20,
  ): Promise<{
    items: FlaggedArticleDto[];
    pagination: { cursor: string | null; hasMore: boolean };
  }> {
    const take = Math.min(limit, 100);
    const reports = await this.prisma.moderationReport.findMany({
      where: {
        isFlagged: true,
        status: 'FLAGGED',
      },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            slug: true,
            domain: true,
            submittedAt: true,
            author: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
    });

    const hasMore = reports.length > take;
    const items = reports.slice(0, take);

    return {
      items: items.map((r) => ({
        articleId: r.article.id,
        articleTitle: r.article.title,
        articleSlug: r.article.slug,
        authorId: r.article.author.id,
        authorName: r.article.author.name,
        domain: r.article.domain,
        submittedAt: r.article.submittedAt?.toISOString() ?? null,
        moderationReport: this.toModerationReportDto(r),
      })),
      pagination: {
        cursor: items.length > 0 ? items[items.length - 1].id : null,
        hasMore,
      },
    };
  }

  // ─── Admin Actions ────────────────────────────────────────────────────────

  async adminDismissFlag(
    articleId: string,
    adminId: string,
    reason: string,
    correlationId: string,
  ): Promise<ModerationReportDto> {
    const report = await this.prisma.moderationReport.findFirst({
      where: { articleId, isFlagged: true, status: 'FLAGGED' },
    });

    if (!report) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_FLAGGED,
        'No flagged moderation report found for this article',
        HttpStatus.NOT_FOUND,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.moderationReport.update({
        where: { id: report.id },
        data: {
          status: 'DISMISSED',
          adminId,
          adminAction: 'DISMISS',
          adminReason: reason,
          resolvedAt: new Date(),
        },
      });

      await this.auditService.log(
        {
          actorId: adminId,
          action: 'MODERATION_DISMISS',
          entityType: 'Article',
          entityId: articleId,
          details: { reason, reportId: report.id },
          correlationId,
        },
        tx,
      );

      return result;
    });

    // Emit moderated event
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { authorId: true, domain: true, title: true },
    });

    if (article) {
      this.eventEmitter.emit('publication.article.moderated', {
        articleId,
        authorId: article.authorId,
        adminId,
        action: 'DISMISS',
        reason,
        timestamp: new Date().toISOString(),
        correlationId,
      });

      // Proceed to editorial review
      this.eventEmitter.emit('publication.article.moderation.cleared', {
        articleId,
        authorId: article.authorId,
        domain: article.domain,
        title: article.title,
        timestamp: new Date().toISOString(),
        correlationId,
      });
    }

    this.logger.log('Moderation flag dismissed', {
      module: 'publication',
      articleId,
      adminId,
      correlationId,
    });

    return this.toModerationReportDto(updated);
  }

  async adminRequestCorrections(
    articleId: string,
    adminId: string,
    reason: string,
    correlationId: string,
  ): Promise<ModerationReportDto> {
    const report = await this.prisma.moderationReport.findFirst({
      where: { articleId, isFlagged: true, status: 'FLAGGED' },
    });

    if (!report) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_FLAGGED,
        'No flagged moderation report found for this article',
        HttpStatus.NOT_FOUND,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.moderationReport.update({
        where: { id: report.id },
        data: {
          status: 'CORRECTIONS_REQUESTED',
          adminId,
          adminAction: 'REQUEST_CORRECTIONS',
          adminReason: reason,
          resolvedAt: new Date(),
        },
      });

      await tx.article.update({
        where: { id: articleId },
        data: { status: 'REVISION_REQUESTED' },
      });

      await this.auditService.log(
        {
          actorId: adminId,
          action: 'MODERATION_REQUEST_CORRECTIONS',
          entityType: 'Article',
          entityId: articleId,
          details: { reason, reportId: report.id },
          correlationId,
        },
        tx,
      );

      return result;
    });

    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { authorId: true },
    });

    if (article) {
      this.eventEmitter.emit('publication.article.moderated', {
        articleId,
        authorId: article.authorId,
        adminId,
        action: 'REQUEST_CORRECTIONS',
        reason,
        timestamp: new Date().toISOString(),
        correlationId,
      });

      this.eventEmitter.emit('notification.enqueue', {
        type: 'MODERATION_CORRECTIONS_REQUESTED',
        title: 'Your article requires corrections',
        description: reason,
        entityId: articleId,
        contributorId: article.authorId,
        category: 'PUBLICATION',
        correlationId,
      });
    }

    this.logger.log('Moderation corrections requested', {
      module: 'publication',
      articleId,
      adminId,
      correlationId,
    });

    return this.toModerationReportDto(updated);
  }

  async adminRejectArticle(
    articleId: string,
    adminId: string,
    reason: string,
    correlationId: string,
  ): Promise<ModerationReportDto> {
    const report = await this.prisma.moderationReport.findFirst({
      where: { articleId, isFlagged: true, status: 'FLAGGED' },
    });

    if (!report) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_FLAGGED,
        'No flagged moderation report found for this article',
        HttpStatus.NOT_FOUND,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.moderationReport.update({
        where: { id: report.id },
        data: {
          status: 'REJECTED',
          adminId,
          adminAction: 'REJECT',
          adminReason: reason,
          resolvedAt: new Date(),
        },
      });

      await tx.article.update({
        where: { id: articleId },
        data: { status: 'ARCHIVED' },
      });

      await this.auditService.log(
        {
          actorId: adminId,
          action: 'MODERATION_REJECT',
          entityType: 'Article',
          entityId: articleId,
          details: { reason, reportId: report.id },
          correlationId,
        },
        tx,
      );

      return result;
    });

    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { authorId: true },
    });

    if (article) {
      this.eventEmitter.emit('publication.article.moderated', {
        articleId,
        authorId: article.authorId,
        adminId,
        action: 'REJECT',
        reason,
        timestamp: new Date().toISOString(),
        correlationId,
      });

      this.eventEmitter.emit('notification.enqueue', {
        type: 'MODERATION_ARTICLE_REJECTED',
        title: 'Your article has been rejected',
        description: reason,
        entityId: articleId,
        contributorId: article.authorId,
        category: 'PUBLICATION',
        correlationId,
      });
    }

    this.logger.log('Article rejected by moderation', {
      module: 'publication',
      articleId,
      adminId,
      correlationId,
    });

    return this.toModerationReportDto(updated);
  }

  async adminUnpublishArticle(
    articleId: string,
    adminId: string,
    reason: string,
    correlationId: string,
  ): Promise<void> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, status: true, authorId: true },
    });

    if (!article) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_FOUND,
        `Article ${articleId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (article.status !== 'PUBLISHED') {
      throw new DomainException(
        ERROR_CODES.ARTICLE_INVALID_STATUS_TRANSITION,
        'Only published articles can be unpublished',
        HttpStatus.CONFLICT,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.article.update({
        where: { id: articleId },
        data: { status: 'ARCHIVED' },
      });

      await this.auditService.log(
        {
          actorId: adminId,
          action: 'MODERATION_UNPUBLISH',
          entityType: 'Article',
          entityId: articleId,
          details: { reason },
          correlationId,
        },
        tx,
      );
    });

    this.eventEmitter.emit('publication.article.moderated', {
      articleId,
      authorId: article.authorId,
      adminId,
      action: 'UNPUBLISH',
      reason,
      timestamp: new Date().toISOString(),
      correlationId,
    });

    this.eventEmitter.emit('notification.enqueue', {
      type: 'MODERATION_ARTICLE_UNPUBLISHED',
      title: 'Your article has been unpublished',
      description: reason,
      entityId: articleId,
      contributorId: article.authorId,
      category: 'PUBLICATION',
      correlationId,
    });

    this.logger.log('Article unpublished by admin', {
      module: 'publication',
      articleId,
      adminId,
      correlationId,
    });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private toModerationReportDto(report: {
    id: string;
    articleId: string;
    plagiarismScore: unknown;
    aiContentScore: unknown;
    flagType: string | null;
    isFlagged: boolean;
    flaggedPassages: unknown;
    status: string;
    adminId: string | null;
    adminAction: string | null;
    adminReason: string | null;
    resolvedAt: Date | null;
    createdAt: Date;
  }): ModerationReportDto {
    return {
      id: report.id,
      articleId: report.articleId,
      plagiarismScore: Number(report.plagiarismScore),
      aiContentScore: Number(report.aiContentScore),
      flagType: report.flagType as ModerationReportDto['flagType'],
      isFlagged: report.isFlagged,
      flaggedPassages: report.flaggedPassages as FlaggedPassage[] | null,
      status: report.status as ModerationReportDto['status'],
      adminId: report.adminId,
      adminAction: report.adminAction as ModerationReportDto['adminAction'],
      adminReason: report.adminReason,
      resolvedAt: report.resolvedAt?.toISOString() ?? null,
      createdAt: report.createdAt.toISOString(),
    };
  }
}

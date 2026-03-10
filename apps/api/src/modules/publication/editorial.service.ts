import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ERROR_CODES } from '@edin/shared';
import type {
  ArticleModerationClearedEvent,
  EditorialFeedbackInput,
  EditorialViewDto,
  EditorialFeedbackDto,
  InlineCommentDto,
  ArticleVersionDto,
  AuthorRevisionViewDto,
  RevisionRequestItem,
  ArticleDto,
} from '@edin/shared';
import { randomUUID } from 'node:crypto';

@Injectable()
export class EditorialService {
  private readonly logger = new Logger(EditorialService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ─── Event Handler ──────────────────────────────────────────────────────────

  @OnEvent('publication.article.moderation.cleared')
  async handleModerationCleared(event: ArticleModerationClearedEvent): Promise<void> {
    try {
      await this.assignEditor(event.articleId, event.correlationId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to assign editor after moderation cleared', {
        module: 'publication',
        articleId: event.articleId,
        correlationId: event.correlationId,
        error: message,
      });
    }
  }

  // ─── Editor Assignment ──────────────────────────────────────────────────────

  async assignEditor(articleId: string, correlationId: string): Promise<void> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_FOUND,
        `Article ${articleId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (article.status !== 'SUBMITTED') {
      this.logger.warn('Article not in SUBMITTED status for editor assignment', {
        module: 'publication',
        articleId,
        currentStatus: article.status,
      });
      return;
    }

    // Load max concurrent assignments limit for this domain
    const criteria = await this.prisma.editorEligibilityCriteria.findUnique({
      where: { domain: article.domain },
    });
    const maxAssignments = criteria?.maxConcurrentAssignments ?? 5;

    // Find eligible editors: role EDITOR, domain matches article domain, not the author
    const eligibleEditors = await this.prisma.contributor.findMany({
      where: {
        role: 'EDITOR',
        domain: article.domain,
        isActive: true,
        id: { not: article.authorId },
      },
      select: {
        id: true,
        editedArticles: {
          where: {
            status: { in: ['EDITORIAL_REVIEW', 'REVISION_REQUESTED'] },
          },
          select: { id: true },
        },
      },
    });

    // Filter out editors who have reached their max concurrent assignments
    const availableEditors = eligibleEditors.filter(
      (e) => e.editedArticles.length < maxAssignments,
    );

    if (availableEditors.length === 0 && eligibleEditors.length > 0) {
      this.logger.warn('All eligible editors are at max concurrent assignments', {
        module: 'publication',
        articleId,
        domain: article.domain,
        maxAssignments,
      });
    }

    if (availableEditors.length === 0) {
      // Also check ADMIN role as fallback editors
      const adminEditors = await this.prisma.contributor.findMany({
        where: {
          role: 'ADMIN',
          isActive: true,
          id: { not: article.authorId },
        },
        select: {
          id: true,
          editedArticles: {
            where: {
              status: { in: ['EDITORIAL_REVIEW', 'REVISION_REQUESTED'] },
            },
            select: { id: true },
          },
        },
      });

      if (adminEditors.length === 0) {
        this.logger.warn('No eligible editor available for article', {
          module: 'publication',
          articleId,
          domain: article.domain,
        });

        // Notify admins that no editor is available
        this.eventEmitter.emit('publication.editor.unavailable', {
          articleId,
          authorId: article.authorId,
          domain: article.domain,
          title: article.title,
          timestamp: new Date().toISOString(),
          correlationId,
        });
        return;
      }

      // Use admin with fewest assignments
      adminEditors.sort((a, b) => a.editedArticles.length - b.editedArticles.length);
      const selectedEditor = adminEditors[0];

      await this.completeEditorAssignment(article, selectedEditor.id, correlationId);
      return;
    }

    // Sort by fewest active assignments
    availableEditors.sort((a, b) => a.editedArticles.length - b.editedArticles.length);
    const selectedEditor = availableEditors[0];

    await this.completeEditorAssignment(article, selectedEditor.id, correlationId);
  }

  private async completeEditorAssignment(
    article: { id: string; authorId: string; domain: string; title: string },
    editorId: string,
    correlationId: string,
  ): Promise<void> {
    await this.prisma.article.update({
      where: { id: article.id },
      data: {
        editorId,
        status: 'EDITORIAL_REVIEW',
      },
    });

    this.eventEmitter.emit('publication.editor.assigned', {
      articleId: article.id,
      authorId: article.authorId,
      editorId,
      domain: article.domain,
      title: article.title,
      timestamp: new Date().toISOString(),
      correlationId,
    });

    this.logger.log('Editor assigned to article', {
      module: 'publication',
      articleId: article.id,
      editorId,
      domain: article.domain,
    });
  }

  // ─── Editorial View ─────────────────────────────────────────────────────────

  async getEditorialView(articleId: string, editorId: string): Promise<EditorialViewDto> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_FOUND,
        `Article ${articleId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (article.editorId !== editorId) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_ASSIGNED_EDITOR,
        'You are not the assigned editor for this article',
        HttpStatus.FORBIDDEN,
      );
    }

    const [feedbackRecords, versions] = await Promise.all([
      this.prisma.editorialFeedback.findMany({
        where: { articleId },
        include: { inlineComments: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.articleVersion.findMany({
        where: { articleId },
        orderBy: { versionNumber: 'desc' },
        select: { versionNumber: true, createdAt: true },
      }),
    ]);

    return {
      article: this.toArticleDto(article),
      feedbackHistory: feedbackRecords.map((fb) => this.toEditorialFeedbackDto(fb)),
      versions: versions.map((v) => ({
        versionNumber: v.versionNumber,
        createdAt: v.createdAt.toISOString(),
      })),
    };
  }

  // ─── Submit Feedback ────────────────────────────────────────────────────────

  async submitFeedback(
    articleId: string,
    editorId: string,
    data: EditorialFeedbackInput,
    correlationId: string,
  ): Promise<EditorialFeedbackDto> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_FOUND,
        `Article ${articleId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (article.editorId !== editorId) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_ASSIGNED_EDITOR,
        'You are not the assigned editor for this article',
        HttpStatus.FORBIDDEN,
      );
    }

    if (article.status !== 'EDITORIAL_REVIEW') {
      throw new DomainException(
        ERROR_CODES.ARTICLE_INVALID_STATUS_TRANSITION,
        'Article is not in editorial review',
        HttpStatus.CONFLICT,
      );
    }

    // Determine new status based on decision
    let newStatus: 'APPROVED' | 'REVISION_REQUESTED' | 'ARCHIVED';
    switch (data.decision) {
      case 'APPROVE':
        newStatus = 'APPROVED';
        break;
      case 'REQUEST_REVISIONS':
        newStatus = 'REVISION_REQUESTED';
        break;
      case 'REJECT':
        newStatus = 'ARCHIVED';
        break;
    }

    // Build revision requests with IDs
    const revisionRequests: RevisionRequestItem[] = (data.revisionRequests ?? []).map((rr) => ({
      id: randomUUID(),
      description: rr.description,
      resolved: false,
    }));

    // Create feedback and inline comments in a transaction
    const feedback = await this.prisma.$transaction(async (tx) => {
      const fb = await tx.editorialFeedback.create({
        data: {
          articleId,
          editorId,
          decision: data.decision,
          overallAssessment: data.overallAssessment,
          revisionRequests:
            revisionRequests.length > 0
              ? (JSON.parse(JSON.stringify(revisionRequests)) as Record<string, unknown>[])
              : undefined,
          articleVersion: article.version,
        },
      });

      // Create inline comments
      if (data.inlineComments && data.inlineComments.length > 0) {
        await tx.inlineComment.createMany({
          data: data.inlineComments.map((ic) => ({
            feedbackId: fb.id,
            articleId,
            editorId,
            content: ic.content,
            highlightStart: ic.highlightStart,
            highlightEnd: ic.highlightEnd,
            articleVersion: article.version,
          })),
        });
      }

      // Update article status
      await tx.article.update({
        where: { id: articleId },
        data: { status: newStatus },
      });

      // Return feedback with inline comments
      return tx.editorialFeedback.findUnique({
        where: { id: fb.id },
        include: { inlineComments: true },
      });
    });

    if (!feedback) {
      throw new DomainException(
        ERROR_CODES.EDITORIAL_FEEDBACK_INVALID,
        'Failed to create editorial feedback',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    // Emit appropriate domain event
    const eventPayload = {
      articleId,
      authorId: article.authorId,
      editorId,
      domain: article.domain,
      title: article.title,
      timestamp: new Date().toISOString(),
      correlationId,
    };

    switch (data.decision) {
      case 'APPROVE':
        this.eventEmitter.emit('publication.article.approved', eventPayload);
        break;
      case 'REQUEST_REVISIONS':
        this.eventEmitter.emit('publication.article.revision-requested', eventPayload);
        break;
      case 'REJECT':
        this.eventEmitter.emit('publication.article.rejected', eventPayload);
        break;
    }

    this.logger.log('Editorial feedback submitted', {
      module: 'publication',
      articleId,
      editorId,
      decision: data.decision,
      newStatus,
    });

    return this.toEditorialFeedbackDto(feedback);
  }

  // ─── Author Revision View ──────────────────────────────────────────────────

  async getAuthorRevisionView(articleId: string, authorId: string): Promise<AuthorRevisionViewDto> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_FOUND,
        `Article ${articleId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (article.authorId !== authorId) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_OWNED,
        'You do not have access to this article',
        HttpStatus.FORBIDDEN,
      );
    }

    const feedbackRecords = await this.prisma.editorialFeedback.findMany({
      where: { articleId },
      include: { inlineComments: true },
      orderBy: { createdAt: 'desc' },
    });

    const feedbackHistory = feedbackRecords.map((fb) => this.toEditorialFeedbackDto(fb));
    const latestFeedback = feedbackHistory.length > 0 ? feedbackHistory[0] : null;

    let editorProfile = null;
    if (article.editorId) {
      const editor = await this.prisma.contributor.findUnique({
        where: { id: article.editorId },
        select: { id: true, name: true, avatarUrl: true },
      });
      if (editor) {
        editorProfile = {
          id: editor.id,
          displayName: editor.name,
          profileImageUrl: editor.avatarUrl,
        };
      }
    }

    return {
      article: this.toArticleDto(article),
      latestFeedback,
      feedbackHistory,
      editorProfile,
    };
  }

  // ─── Resubmit Article ──────────────────────────────────────────────────────

  async resubmitArticle(
    articleId: string,
    authorId: string,
    body: string,
    correlationId: string,
  ): Promise<ArticleDto> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_FOUND,
        `Article ${articleId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (article.authorId !== authorId) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_OWNED,
        'You do not have access to this article',
        HttpStatus.FORBIDDEN,
      );
    }

    if (article.status !== 'REVISION_REQUESTED') {
      throw new DomainException(
        ERROR_CODES.ARTICLE_INVALID_STATUS_TRANSITION,
        'Article is not in revision requested status',
        HttpStatus.CONFLICT,
      );
    }

    // Create a version snapshot of the current body before updating
    const updated = await this.prisma.$transaction(async (tx) => {
      // Snapshot current version
      await tx.articleVersion.create({
        data: {
          articleId,
          versionNumber: article.version,
          body: article.body,
          createdById: authorId,
        },
      });

      // Update article with new body and increment version
      return tx.article.update({
        where: { id: articleId },
        data: {
          body,
          version: { increment: 1 },
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
      });
    });

    this.eventEmitter.emit('publication.article.submitted', {
      articleId: updated.id,
      authorId: updated.authorId,
      domain: updated.domain,
      title: updated.title,
      timestamp: new Date().toISOString(),
      correlationId,
    });

    this.logger.log('Article resubmitted after revisions', {
      module: 'publication',
      articleId,
      authorId,
      newVersion: updated.version,
    });

    return this.toArticleDto(updated);
  }

  // ─── Version History ────────────────────────────────────────────────────────

  async getArticleVersions(articleId: string, userId: string): Promise<ArticleVersionDto[]> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_FOUND,
        `Article ${articleId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (article.authorId !== userId && article.editorId !== userId) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_OWNED,
        'You do not have access to this article',
        HttpStatus.FORBIDDEN,
      );
    }

    const versions = await this.prisma.articleVersion.findMany({
      where: { articleId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true, createdAt: true },
    });

    return versions.map((v) => ({
      versionNumber: v.versionNumber,
      createdAt: v.createdAt.toISOString(),
    }));
  }

  async getArticleVersion(
    articleId: string,
    versionNumber: number,
    userId: string,
  ): Promise<ArticleVersionDto> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_FOUND,
        `Article ${articleId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (article.authorId !== userId && article.editorId !== userId) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_OWNED,
        'You do not have access to this article',
        HttpStatus.FORBIDDEN,
      );
    }

    const version = await this.prisma.articleVersion.findFirst({
      where: { articleId, versionNumber },
    });

    if (!version) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_FOUND,
        `Version ${versionNumber} not found for article ${articleId}`,
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      versionNumber: version.versionNumber,
      body: version.body,
      createdAt: version.createdAt.toISOString(),
    };
  }

  // ─── Publish Article (Admin) ────────────────────────────────────────────────

  async publishArticle(
    articleId: string,
    adminId: string,
    correlationId: string,
  ): Promise<ArticleDto> {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });

    if (!article) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_FOUND,
        `Article ${articleId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Admin check is done at controller level (role guard)

    if (article.status !== 'APPROVED') {
      throw new DomainException(
        ERROR_CODES.ARTICLE_INVALID_STATUS_TRANSITION,
        'Only approved articles can be published',
        HttpStatus.CONFLICT,
      );
    }

    const updated = await this.prisma.article.update({
      where: { id: articleId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    this.eventEmitter.emit('publication.article.published', {
      articleId: updated.id,
      authorId: updated.authorId,
      editorId: updated.editorId,
      domain: updated.domain,
      title: updated.title,
      timestamp: new Date().toISOString(),
      correlationId,
    });

    this.logger.log('Article published', {
      module: 'publication',
      articleId,
      adminId,
    });

    return this.toArticleDto(updated);
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private toArticleDto(article: {
    id: string;
    title: string;
    slug: string;
    abstract: string;
    body: string;
    domain: string;
    status: string;
    version: number;
    authorId: string;
    editorId: string | null;
    createdAt: Date;
    updatedAt: Date;
    submittedAt: Date | null;
    publishedAt: Date | null;
  }): ArticleDto {
    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      abstract: article.abstract,
      body: article.body,
      domain: article.domain,
      status: article.status as ArticleDto['status'],
      version: article.version,
      authorId: article.authorId,
      editorId: article.editorId,
      createdAt: article.createdAt.toISOString(),
      updatedAt: article.updatedAt.toISOString(),
      submittedAt: article.submittedAt?.toISOString() ?? null,
      publishedAt: article.publishedAt?.toISOString() ?? null,
    };
  }

  private toEditorialFeedbackDto(fb: {
    id: string;
    articleId: string;
    editorId: string;
    decision: string;
    overallAssessment: string;
    revisionRequests: unknown;
    articleVersion: number;
    createdAt: Date;
    inlineComments: Array<{
      id: string;
      content: string;
      highlightStart: number;
      highlightEnd: number;
      articleVersion: number;
      resolved: boolean;
      createdAt: Date;
    }>;
  }): EditorialFeedbackDto {
    const revisionRequests = Array.isArray(fb.revisionRequests)
      ? (fb.revisionRequests as RevisionRequestItem[])
      : [];

    return {
      id: fb.id,
      articleId: fb.articleId,
      editorId: fb.editorId,
      decision: fb.decision as EditorialFeedbackDto['decision'],
      overallAssessment: fb.overallAssessment,
      revisionRequests,
      inlineComments: fb.inlineComments.map((ic) => this.toInlineCommentDto(ic)),
      articleVersion: fb.articleVersion,
      createdAt: fb.createdAt.toISOString(),
    };
  }

  private toInlineCommentDto(ic: {
    id: string;
    content: string;
    highlightStart: number;
    highlightEnd: number;
    articleVersion: number;
    resolved: boolean;
    createdAt: Date;
  }): InlineCommentDto {
    return {
      id: ic.id,
      content: ic.content,
      highlightStart: ic.highlightStart,
      highlightEnd: ic.highlightEnd,
      articleVersion: ic.articleVersion,
      resolved: ic.resolved,
      createdAt: ic.createdAt.toISOString(),
    };
  }
}

import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ERROR_CODES } from '@edin/shared';
import { submitArticleSchema } from '@edin/shared';
import type { Prisma } from '../../../generated/prisma/client/client.js';
import type {
  ArticleDto,
  ArticleListItemDto,
  CreateArticleDto,
  UpdateArticleDto,
  PublicArticleListItemDto,
  PublicArticleDetailDto,
  ArticleFilterParams,
  SitemapArticleDto,
} from '@edin/shared';

@Injectable()
export class ArticleService {
  private readonly logger = new Logger(ArticleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createArticle(authorId: string, data: CreateArticleDto): Promise<ArticleDto> {
    const slug = await this.generateUniqueSlug(data.title);

    const article = await this.prisma.article.create({
      data: {
        authorId,
        title: data.title,
        slug,
        abstract: data.abstract ?? '',
        body: data.body ?? '',
        domain: data.domain,
        status: 'DRAFT',
      },
    });

    this.logger.log('Article draft created', {
      module: 'publication',
      articleId: article.id,
      authorId,
      domain: data.domain,
    });

    return this.toArticleDto(article);
  }

  async getArticle(id: string, userId: string): Promise<ArticleDto> {
    const article = await this.prisma.article.findUnique({ where: { id } });

    if (!article) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_FOUND,
        `Article ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (article.authorId !== userId) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_OWNED,
        'You do not have access to this article',
        HttpStatus.FORBIDDEN,
      );
    }

    return this.toArticleDto(article);
  }

  async updateArticle(id: string, userId: string, data: UpdateArticleDto): Promise<ArticleDto> {
    const article = await this.prisma.article.findUnique({ where: { id } });

    if (!article) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_FOUND,
        `Article ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (article.authorId !== userId) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_OWNED,
        'You do not have access to this article',
        HttpStatus.FORBIDDEN,
      );
    }

    if (article.status !== 'DRAFT') {
      throw new DomainException(
        ERROR_CODES.ARTICLE_INVALID_STATUS_TRANSITION,
        'Only draft articles can be edited',
        HttpStatus.CONFLICT,
      );
    }

    const updateData: Prisma.ArticleUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.abstract !== undefined) updateData.abstract = data.abstract;
    if (data.body !== undefined) updateData.body = data.body;
    if (data.domain !== undefined) updateData.domain = data.domain;

    // Regenerate slug if title changed
    if (data.title !== undefined && data.title !== article.title) {
      updateData.slug = await this.generateUniqueSlug(data.title);
    }

    const updated = await this.prisma.article.update({
      where: { id },
      data: updateData,
    });

    return this.toArticleDto(updated);
  }

  async getUserArticles(
    userId: string,
    status?: string,
    cursor?: string,
    limit: number = 20,
  ): Promise<{
    items: ArticleListItemDto[];
    pagination: { cursor: string | null; hasMore: boolean; total: number };
  }> {
    const take = Math.min(limit, 100);

    const where: Prisma.ArticleWhereInput = { authorId: userId };
    if (status) {
      where.status = status as Prisma.ArticleWhereInput['status'];
    }

    const findWhere: Prisma.ArticleWhereInput = { ...where };
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8')) as {
          id: string;
          updatedAt: string;
        };
        findWhere.OR = [
          { updatedAt: { lt: new Date(decoded.updatedAt) } },
          {
            updatedAt: new Date(decoded.updatedAt),
            id: { lt: decoded.id },
          },
        ];
      } catch {
        // Invalid cursor, ignore
      }
    }

    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where: findWhere,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: take + 1,
        select: {
          id: true,
          title: true,
          slug: true,
          abstract: true,
          domain: true,
          status: true,
          version: true,
          updatedAt: true,
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    const hasMore = articles.length > take;
    const items = hasMore ? articles.slice(0, take) : articles;

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1];
      nextCursor = Buffer.from(
        JSON.stringify({ id: last.id, updatedAt: last.updatedAt.toISOString() }),
      ).toString('base64url');
    }

    return {
      items: items.map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        abstract: a.abstract,
        domain: a.domain,
        status: a.status,
        version: a.version,
        updatedAt: a.updatedAt.toISOString(),
      })),
      pagination: {
        cursor: nextCursor,
        hasMore,
        total,
      },
    };
  }

  async submitArticle(id: string, userId: string, correlationId: string): Promise<ArticleDto> {
    const article = await this.prisma.article.findUnique({ where: { id } });

    if (!article) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_FOUND,
        `Article ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (article.authorId !== userId) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_OWNED,
        'You do not have access to this article',
        HttpStatus.FORBIDDEN,
      );
    }

    if (article.status !== 'DRAFT') {
      throw new DomainException(
        ERROR_CODES.ARTICLE_INVALID_STATUS_TRANSITION,
        'Only draft articles can be submitted',
        HttpStatus.CONFLICT,
      );
    }

    // Validate article meets submission requirements
    const validation = submitArticleSchema.safeParse({
      title: article.title,
      abstract: article.abstract,
      body: article.body,
      domain: article.domain,
    });

    if (!validation.success) {
      const details = validation.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new DomainException(
        ERROR_CODES.ARTICLE_VALIDATION_FAILED,
        'Article does not meet submission requirements',
        HttpStatus.BAD_REQUEST,
        details,
      );
    }

    const updated = await this.prisma.article.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    this.eventEmitter.emit('publication.article.submitted', {
      articleId: updated.id,
      authorId: updated.authorId,
      domain: updated.domain,
      title: updated.title,
      timestamp: new Date().toISOString(),
      correlationId,
    });

    this.logger.log('Article submitted for review', {
      module: 'publication',
      articleId: updated.id,
      authorId: userId,
      domain: updated.domain,
    });

    return this.toArticleDto(updated);
  }

  async deleteArticle(id: string, userId: string): Promise<void> {
    const article = await this.prisma.article.findUnique({ where: { id } });

    if (!article) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_FOUND,
        `Article ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (article.authorId !== userId) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_OWNED,
        'You do not have access to this article',
        HttpStatus.FORBIDDEN,
      );
    }

    if (article.status !== 'DRAFT') {
      throw new DomainException(
        ERROR_CODES.ARTICLE_INVALID_STATUS_TRANSITION,
        'Only draft articles can be deleted',
        HttpStatus.CONFLICT,
      );
    }

    await this.prisma.article.delete({ where: { id } });

    this.logger.log('Article draft deleted', {
      module: 'publication',
      articleId: id,
      authorId: userId,
    });
  }

  // ─── Public Article Methods ─────────────────────────────────────────────────

  async listPublished(
    filters: ArticleFilterParams,
    cursor?: string,
    limit: number = 20,
  ): Promise<{
    items: PublicArticleListItemDto[];
    pagination: { cursor: string | null; hasMore: boolean; total: number };
  }> {
    const take = Math.min(limit, 100);

    const where: Prisma.ArticleWhereInput = { status: 'PUBLISHED' };
    if (filters.domain) {
      where.domain = filters.domain as Prisma.ArticleWhereInput['domain'];
    }
    if (filters.authorId) {
      where.authorId = filters.authorId;
    }
    if (filters.dateFrom || filters.dateTo) {
      where.publishedAt = {};
      if (filters.dateFrom) {
        (where.publishedAt as Prisma.DateTimeNullableFilter).gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        (where.publishedAt as Prisma.DateTimeNullableFilter).lte = new Date(filters.dateTo);
      }
    }

    const findWhere: Prisma.ArticleWhereInput = { ...where };
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8')) as {
          id: string;
          publishedAt: string;
        };
        // Use AND to safely combine date range filter with cursor condition
        const andConditions: Prisma.ArticleWhereInput[] = [];
        if (findWhere.publishedAt) {
          andConditions.push({
            publishedAt: findWhere.publishedAt as Prisma.DateTimeNullableFilter,
          });
          delete findWhere.publishedAt;
        }
        andConditions.push({
          OR: [
            { publishedAt: { lt: new Date(decoded.publishedAt) } },
            {
              publishedAt: new Date(decoded.publishedAt),
              id: { lt: decoded.id },
            },
          ],
        });
        findWhere.AND = andConditions;
      } catch {
        // Invalid cursor, ignore
      }
    }

    // Note: body is fetched to compute readingTimeMinutes. This could be optimized
    // by storing readingTimeMinutes as a computed column at publish time.
    const [articles, total] = await Promise.all([
      this.prisma.article.findMany({
        where: findWhere,
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        take: take + 1,
        select: {
          id: true,
          title: true,
          slug: true,
          abstract: true,
          domain: true,
          body: true,
          publishedAt: true,
          author: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              domain: true,
              bio: true,
            },
          },
        },
      }),
      this.prisma.article.count({ where }),
    ]);

    const hasMore = articles.length > take;
    const items = hasMore ? articles.slice(0, take) : articles;

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1];
      nextCursor = Buffer.from(
        JSON.stringify({ id: last.id, publishedAt: last.publishedAt!.toISOString() }),
      ).toString('base64url');
    }

    return {
      items: items.map((a) => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        abstract: a.abstract,
        domain: a.domain,
        publishedAt: a.publishedAt!.toISOString(),
        readingTimeMinutes: this.calculateReadingTime(a.body),
        author: {
          id: a.author.id,
          name: a.author.name,
          avatarUrl: a.author.avatarUrl,
          domain: a.author.domain,
          bio: a.author.bio,
        },
      })),
      pagination: {
        cursor: nextCursor,
        hasMore,
        total,
      },
    };
  }

  async getPublishedBySlug(slug: string): Promise<PublicArticleDetailDto> {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            domain: true,
            bio: true,
          },
        },
        editor: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            domain: true,
          },
        },
      },
    });

    if (!article || article.status !== 'PUBLISHED') {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_FOUND,
        `Published article not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    // Evaluation scores for articles will be available once article evaluation pipeline is integrated.
    // For now, return null — the frontend conditionally renders the evaluation section.
    const evaluationScore: number | null = null;
    const evaluationNarrative: string | null = null;

    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      abstract: article.abstract,
      body: article.body,
      domain: article.domain,
      publishedAt: article.publishedAt!.toISOString(),
      readingTimeMinutes: this.calculateReadingTime(article.body),
      author: {
        id: article.author.id,
        name: article.author.name,
        avatarUrl: article.author.avatarUrl,
        domain: article.author.domain,
        bio: article.author.bio,
      },
      editor: article.editor
        ? {
            id: article.editor.id,
            name: article.editor.name,
            avatarUrl: article.editor.avatarUrl,
            domain: article.editor.domain,
          }
        : null,
      evaluationScore,
      evaluationNarrative,
    };
  }

  async getSitemapArticles(): Promise<SitemapArticleDto[]> {
    const articles = await this.prisma.article.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        slug: true,
        publishedAt: true,
        updatedAt: true,
      },
      orderBy: { publishedAt: 'desc' },
    });

    return articles.map((a) => ({
      slug: a.slug,
      publishedAt: a.publishedAt!.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));
  }

  calculateReadingTime(body: string): number {
    const text = this.extractTextFromBody(body);
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }

  private extractTextFromBody(body: string): string {
    try {
      const parsed = JSON.parse(body) as {
        text?: string;
        content?: Array<{ text?: string; content?: unknown[] }>;
      };
      return this.extractTextFromNode(parsed);
    } catch {
      // Body is plain text (not JSON)
      return body;
    }
  }

  private extractTextFromNode(node: {
    text?: string;
    content?: Array<{ text?: string; content?: unknown[] }>;
  }): string {
    if (node.text) return node.text;
    if (node.content && Array.isArray(node.content)) {
      return node.content
        .map((child) =>
          this.extractTextFromNode(
            child as { text?: string; content?: Array<{ text?: string; content?: unknown[] }> },
          ),
        )
        .join(' ');
    }
    return '';
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private async generateUniqueSlug(title: string): Promise<string> {
    const base = title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 150);

    const suffix = Math.random().toString(36).slice(2, 8);
    const slug = `${base}-${suffix}`;

    // Verify uniqueness
    const existing = await this.prisma.article.findUnique({ where: { slug } });
    if (existing) {
      // Extremely unlikely collision — retry with different suffix and verify
      const retrySuffix = Math.random().toString(36).slice(2, 10);
      const retrySlug = `${base}-${retrySuffix}`;
      const retryExisting = await this.prisma.article.findUnique({ where: { slug: retrySlug } });
      if (retryExisting) {
        // Double collision — use timestamp to guarantee uniqueness
        return `${base}-${Date.now().toString(36)}`;
      }
      return retrySlug;
    }

    return slug;
  }

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
}

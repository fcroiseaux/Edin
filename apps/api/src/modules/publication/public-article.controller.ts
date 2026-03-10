import { Controller, Get, Param, Query, Req, HttpStatus, Header } from '@nestjs/common';
import { ArticleService } from './article.service.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ERROR_CODES, publicArticleFilterSchema } from '@edin/shared';
import type { Request } from 'express';

@Controller({ path: 'articles/published', version: '1' })
export class PublicArticleController {
  constructor(private readonly articleService: ArticleService) {}

  @Get()
  async listPublished(
    @Query('domain') domain: string | undefined,
    @Query('authorId') authorId: string | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @Query('cursor') cursor: string | undefined,
    @Query('limit') limitStr: string | undefined,
    @Req() req: Request & { correlationId?: string },
  ) {
    const parsed = publicArticleFilterSchema.safeParse({
      domain,
      authorId,
      dateFrom,
      dateTo,
      cursor,
      limit: limitStr ? parseInt(limitStr, 10) : undefined,
    });

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid filter parameters',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      );
    }

    const { limit: parsedLimit, cursor: parsedCursor, ...filters } = parsed.data;
    const result = await this.articleService.listPublished(
      filters,
      parsedCursor,
      parsedLimit ?? 20,
    );

    return createSuccessResponse(result.items, req.correlationId ?? '', result.pagination);
  }

  // IMPORTANT: Literal routes must be declared BEFORE parameterized routes
  // to avoid NestJS matching `:slug` before `sitemap/entries`
  @Get('sitemap/entries')
  @Header('Cache-Control', 'public, max-age=3600')
  async getSitemapEntries(@Req() req: Request & { correlationId?: string }) {
    const articles = await this.articleService.getSitemapArticles();
    return createSuccessResponse(articles, req.correlationId ?? '');
  }

  @Get(':slug')
  async getPublishedBySlug(
    @Param('slug') slug: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    if (!slug || slug.trim().length === 0) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Article slug is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const article = await this.articleService.getPublishedBySlug(slug);
    return createSuccessResponse(article, req.correlationId ?? '');
  }
}

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ModerationService } from './moderation.service.js';
import { Action, ERROR_CODES } from '@edin/shared';
import type { Request } from 'express';
import { z } from 'zod';

interface CurrentUserPayload {
  id: string;
  role: string;
}

const moderationActionSchema = z.object({
  reason: z.string().min(1, 'Reason is required').max(2000),
});

const paginationQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const articleIdSchema = z.string().uuid('articleId must be a valid UUID');

@Controller({ path: 'admin/publication/moderation', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class ModerationAdminController {
  constructor(private readonly moderationService: ModerationService) {}

  private validateArticleId(articleId: string): string {
    const parsed = articleIdSchema.safeParse(articleId);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'articleId must be a valid UUID',
        HttpStatus.BAD_REQUEST,
      );
    }
    return parsed.data;
  }

  @Get('flagged')
  @CheckAbility((ability) => ability.can(Action.Manage, 'Article'))
  async getFlaggedArticles(
    @Query() query: Record<string, unknown>,
    @Req() req: Request & { correlationId?: string },
  ) {
    const parsed = paginationQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
      );
    }

    const result = await this.moderationService.getFlaggedArticles(
      parsed.data.cursor,
      parsed.data.limit,
    );

    return createSuccessResponse(result.items, req.correlationId ?? '', {
      cursor: result.pagination.cursor ?? null,
      hasMore: result.pagination.hasMore,
      total: result.items.length,
    });
  }

  @Get(':articleId/report')
  @CheckAbility((ability) => ability.can(Action.Manage, 'Article'))
  async getModerationReport(
    @Param('articleId') articleId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    this.validateArticleId(articleId);
    const report = await this.moderationService.getModerationReport(articleId);

    if (!report) {
      throw new DomainException(
        ERROR_CODES.ARTICLE_NOT_FOUND,
        'No moderation report found for this article',
        HttpStatus.NOT_FOUND,
      );
    }

    return createSuccessResponse(report, req.correlationId ?? '');
  }

  @Post(':articleId/dismiss')
  @HttpCode(HttpStatus.OK)
  @CheckAbility((ability) => ability.can(Action.Manage, 'Article'))
  async dismissFlag(
    @Param('articleId') articleId: string,
    @Body() body: unknown,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request & { correlationId?: string },
  ) {
    this.validateArticleId(articleId);
    const parsed = moderationActionSchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
      );
    }

    const result = await this.moderationService.adminDismissFlag(
      articleId,
      user.id,
      parsed.data.reason,
      req.correlationId ?? '',
    );

    return createSuccessResponse(result, req.correlationId ?? '');
  }

  @Post(':articleId/request-corrections')
  @HttpCode(HttpStatus.OK)
  @CheckAbility((ability) => ability.can(Action.Manage, 'Article'))
  async requestCorrections(
    @Param('articleId') articleId: string,
    @Body() body: unknown,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request & { correlationId?: string },
  ) {
    this.validateArticleId(articleId);
    const parsed = moderationActionSchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
      );
    }

    const result = await this.moderationService.adminRequestCorrections(
      articleId,
      user.id,
      parsed.data.reason,
      req.correlationId ?? '',
    );

    return createSuccessResponse(result, req.correlationId ?? '');
  }

  @Post(':articleId/reject')
  @HttpCode(HttpStatus.OK)
  @CheckAbility((ability) => ability.can(Action.Manage, 'Article'))
  async rejectArticle(
    @Param('articleId') articleId: string,
    @Body() body: unknown,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request & { correlationId?: string },
  ) {
    this.validateArticleId(articleId);
    const parsed = moderationActionSchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
      );
    }

    const result = await this.moderationService.adminRejectArticle(
      articleId,
      user.id,
      parsed.data.reason,
      req.correlationId ?? '',
    );

    return createSuccessResponse(result, req.correlationId ?? '');
  }

  @Post(':articleId/unpublish')
  @HttpCode(HttpStatus.OK)
  @CheckAbility((ability) => ability.can(Action.Manage, 'Article'))
  async unpublishArticle(
    @Param('articleId') articleId: string,
    @Body() body: unknown,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request & { correlationId?: string },
  ) {
    this.validateArticleId(articleId);
    const parsed = moderationActionSchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
      );
    }

    await this.moderationService.adminUnpublishArticle(
      articleId,
      user.id,
      parsed.data.reason,
      req.correlationId ?? '',
    );

    return createSuccessResponse({ success: true }, req.correlationId ?? '');
  }
}

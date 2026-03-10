import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Action } from '@edin/shared';

const VALID_DOCUMENT_TYPES = [
  'MODEL_CARD',
  'EVALUATION_CRITERIA',
  'HUMAN_OVERSIGHT_REPORT',
  'DATA_PROCESSING_RECORD',
] as const;
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../../common/guards/ability.guard.js';
import { CheckAbility } from '../../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../../common/decorators/current-user.decorator.js';
import { createSuccessResponse } from '../../../common/types/api-response.type.js';
import { EuAiActService } from './eu-ai-act.service.js';

@Controller({ path: 'admin/compliance/ai-act', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class EuAiActController {
  constructor(private readonly euAiActService: EuAiActService) {}

  @Get()
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async listDocuments(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Req() req?: Request,
  ) {
    const correlationId = req?.correlationId ?? '';
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const result = await this.euAiActService.listDocuments(cursor, parsedLimit);

    return createSuccessResponse(result.items, correlationId, {
      cursor: result.nextCursor,
      hasMore: result.nextCursor !== null,
      total: result.items.length,
    });
  }

  @Get(':docId')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async getDocument(@Param('docId') docId: string, @Req() req?: Request) {
    const correlationId = req?.correlationId ?? '';
    const result = await this.euAiActService.getDocument(docId);
    return createSuccessResponse(result, correlationId);
  }

  @Post('generate')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async generateDocument(
    @Body() body: { documentType: string },
    @CurrentUser() user: CurrentUserPayload,
    @Req() req?: Request,
  ) {
    if (
      !body.documentType ||
      !VALID_DOCUMENT_TYPES.includes(body.documentType as (typeof VALID_DOCUMENT_TYPES)[number])
    ) {
      throw new BadRequestException(
        `Invalid documentType. Must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}`,
      );
    }
    const correlationId = req?.correlationId ?? '';
    const result = await this.euAiActService.generateDocument(body.documentType, correlationId);
    return createSuccessResponse(result, correlationId);
  }

  @Post(':docId/review')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async reviewDocument(
    @Param('docId') docId: string,
    @Body() body: { reviewNotes: string },
    @CurrentUser() user: CurrentUserPayload,
    @Req() req?: Request,
  ) {
    const correlationId = req?.correlationId ?? '';
    const result = await this.euAiActService.reviewDocument(
      docId,
      user.id,
      body.reviewNotes,
      correlationId,
    );
    return createSuccessResponse(result, correlationId);
  }
}

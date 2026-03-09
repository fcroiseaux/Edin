import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import {
  ERROR_CODES,
  evaluationQuerySchema,
  evaluationHistoryQuerySchema,
  flagEvaluationSchema,
} from '@edin/shared';
import { EvaluationService } from './evaluation.service.js';
import { EvaluationReviewService } from './services/evaluation-review.service.js';
import { randomUUID } from 'crypto';

@Controller({ path: 'evaluations', version: '1' })
@UseGuards(JwtAuthGuard)
export class EvaluationController {
  private readonly logger = new Logger(EvaluationController.name);

  constructor(
    private readonly evaluationService: EvaluationService,
    private readonly evaluationReviewService: EvaluationReviewService,
  ) {}

  @Get()
  async getMyEvaluations(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: Record<string, unknown>,
  ) {
    const correlationId = randomUUID();
    const parsed = evaluationQuerySchema.safeParse(query);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const result = await this.evaluationService.getEvaluationsForContributor(user.id, parsed.data);

    this.logger.debug('Listed evaluations', {
      module: 'evaluation',
      userId: user.id,
      correlationId,
    });

    return createSuccessResponse(result.items, correlationId, result.pagination);
  }

  @Get('history')
  async getEvaluationHistory(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: Record<string, unknown>,
  ) {
    const correlationId = randomUUID();
    const parsed = evaluationHistoryQuerySchema.safeParse(query);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const result = await this.evaluationService.getEvaluationHistory(user.id, parsed.data);

    this.logger.debug('Listed evaluation history', {
      module: 'evaluation',
      userId: user.id,
      correlationId,
    });

    return createSuccessResponse(result.items, correlationId, result.pagination);
  }

  @Get('contribution/:contributionId')
  async getEvaluationByContribution(
    @CurrentUser() user: CurrentUserPayload,
    @Param('contributionId') contributionId: string,
  ) {
    const correlationId = randomUUID();
    const result = await this.evaluationService.getEvaluationByContribution(contributionId);

    if (!result) {
      throw new DomainException(
        ERROR_CODES.EVALUATION_NOT_FOUND,
        'No evaluation found for this contribution',
        HttpStatus.NOT_FOUND,
      );
    }

    if (result.contributorId !== user.id && user.role !== 'ADMIN') {
      throw new DomainException(
        ERROR_CODES.FORBIDDEN,
        'You can only view your own evaluations',
        HttpStatus.FORBIDDEN,
      );
    }

    return createSuccessResponse(result, correlationId);
  }

  @Get('contribution/:contributionId/status')
  async getEvaluationStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param('contributionId') contributionId: string,
  ) {
    const correlationId = randomUUID();
    const result = await this.evaluationService.getEvaluationStatus(contributionId);

    if (result && result.contributorId !== user.id && user.role !== 'ADMIN') {
      throw new DomainException(
        ERROR_CODES.FORBIDDEN,
        'You can only view your own evaluations',
        HttpStatus.FORBIDDEN,
      );
    }

    return createSuccessResponse({ status: result?.status ?? null }, correlationId);
  }

  @Post(':id/flag')
  async flagEvaluation(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    const correlationId = randomUUID();
    const parsed = flagEvaluationSchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid flag request',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e: { path: (string | number)[]; message: string }) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const result = await this.evaluationReviewService.flagEvaluation(
      id,
      user.id,
      parsed.data.flagReason,
      correlationId,
    );

    this.logger.log('Evaluation flagged for review', {
      module: 'evaluation',
      evaluationId: id,
      userId: user.id,
      correlationId,
    });

    return createSuccessResponse(result, correlationId);
  }

  @Get(':id/review-status')
  async getReviewStatus(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    const correlationId = randomUUID();

    // Verify the evaluation belongs to the user
    const evaluation = await this.evaluationService.getEvaluation(id);
    if (evaluation.contributorId !== user.id && user.role !== 'ADMIN') {
      throw new DomainException(
        ERROR_CODES.FORBIDDEN,
        'You can only view your own evaluations',
        HttpStatus.FORBIDDEN,
      );
    }

    const result = await this.evaluationReviewService.getReviewStatusForEvaluation(id);
    return createSuccessResponse(result, correlationId);
  }

  @Get(':id')
  async getEvaluation(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    const correlationId = randomUUID();
    const result = await this.evaluationService.getEvaluation(id);

    if (result.contributorId !== user.id && user.role !== 'ADMIN') {
      throw new DomainException(
        ERROR_CODES.FORBIDDEN,
        'You can only view your own evaluations',
        HttpStatus.FORBIDDEN,
      );
    }

    this.logger.debug('Retrieved evaluation', {
      module: 'evaluation',
      evaluationId: id,
      userId: user.id,
      correlationId,
    });

    return createSuccessResponse(result, correlationId);
  }
}

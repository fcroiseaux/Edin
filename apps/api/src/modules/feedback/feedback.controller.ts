import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { Action } from '../auth/casl/action.enum.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ERROR_CODES, feedbackSubmissionSchema } from '@edin/shared';
import { FeedbackService } from './feedback.service.js';
import { feedbackQueryDto } from './dto/feedback-query.dto.js';
import { randomUUID } from 'crypto';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller({ path: 'feedback', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class FeedbackController {
  private readonly logger = new Logger(FeedbackController.name);

  constructor(private readonly feedbackService: FeedbackService) {}

  @Get('assignments')
  @CheckAbility((ability) => ability.can(Action.Read, 'PeerFeedback'))
  async getAssignments(
    @CurrentUser() user: CurrentUserPayload,
    @Query() rawQuery: Record<string, unknown>,
  ) {
    const correlationId = randomUUID();
    const parsed = feedbackQueryDto.safeParse(rawQuery);

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

    const result = await this.feedbackService.getAssignmentsForReviewer(user.id, parsed.data);

    return createSuccessResponse(result.items, correlationId, result.pagination);
  }

  @Get('assignments/:id')
  @CheckAbility((ability) => ability.can(Action.Read, 'PeerFeedback'))
  async getAssignmentById(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') feedbackId: string,
  ) {
    const correlationId = randomUUID();
    this.validateUuid(feedbackId, 'feedback ID');
    const result = await this.feedbackService.getAssignmentById(feedbackId, user.id);

    return createSuccessResponse(result, correlationId);
  }

  @Get('received')
  @CheckAbility((ability) => ability.can(Action.Read, 'PeerFeedback'))
  async getReceivedFeedback(
    @CurrentUser() user: CurrentUserPayload,
    @Query() rawQuery: Record<string, unknown>,
  ) {
    const correlationId = randomUUID();
    const parsed = feedbackQueryDto.safeParse(rawQuery);

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

    const result = await this.feedbackService.getReceivedFeedback(user.id, parsed.data);

    return createSuccessResponse(result.items, correlationId, result.pagination);
  }

  @Post(':id/submit')
  @CheckAbility((ability) => ability.can(Action.Update, 'PeerFeedback'))
  async submitFeedback(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') feedbackId: string,
    @Body() rawBody: unknown,
  ) {
    const correlationId = randomUUID();
    this.validateUuid(feedbackId, 'feedback ID');
    const parsed = feedbackSubmissionSchema.safeParse(rawBody);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid feedback submission',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const result = await this.feedbackService.submitFeedback(
      feedbackId,
      parsed.data,
      user.id,
      correlationId,
    );

    return createSuccessResponse(result, correlationId);
  }

  @Get('contributions/:id')
  @CheckAbility((ability) => ability.can(Action.Read, 'PeerFeedback'))
  async getContributionFeedback(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') contributionId: string,
  ) {
    const correlationId = randomUUID();
    this.validateUuid(contributionId, 'contribution ID');

    // Enforce field-level CASL restriction at query level
    const assignments =
      user.role === 'ADMIN'
        ? await this.feedbackService.getAssignmentsForContribution(contributionId)
        : await this.feedbackService.getAssignmentsForContribution(contributionId, user.id);

    return createSuccessResponse(assignments, correlationId);
  }

  private validateUuid(id: string, fieldName: string): void {
    if (!UUID_REGEX.test(id)) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        `Invalid ${fieldName} format`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}

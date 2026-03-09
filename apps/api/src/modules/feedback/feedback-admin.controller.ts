import { Controller, Post, Body, UseGuards, Logger, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { Action } from '../auth/casl/action.enum.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ERROR_CODES } from '@edin/shared';
import { FeedbackService } from './feedback.service.js';
import { adminAssignDto } from './dto/feedback-query.dto.js';
import { randomUUID } from 'crypto';

@Controller({ path: 'admin/feedback', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class FeedbackAdminController {
  private readonly logger = new Logger(FeedbackAdminController.name);

  constructor(private readonly feedbackService: FeedbackService) {}

  @Post('assign')
  @CheckAbility((ability) => ability.can(Action.Manage, 'PeerFeedback'))
  async adminAssign(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: Record<string, unknown>,
  ) {
    const correlationId = randomUUID();
    const parsed = adminAssignDto.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid request body',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const result = await this.feedbackService.adminAssignReviewer(
      parsed.data.contributionId,
      parsed.data.reviewerId,
      user.id,
      correlationId,
    );

    this.logger.log('Admin assigned peer reviewer', {
      module: 'feedback',
      contributionId: parsed.data.contributionId,
      reviewerId: parsed.data.reviewerId,
      adminId: user.id,
      correlationId,
    });

    return createSuccessResponse(result, correlationId);
  }
}

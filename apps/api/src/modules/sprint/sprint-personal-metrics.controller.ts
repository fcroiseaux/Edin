import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { SprintMetricsService } from './sprint-metrics.service.js';
import { Action, ERROR_CODES } from '@edin/shared';
import type { Request } from 'express';

/**
 * Controller for personal contributor sprint metrics.
 * Separated from SprintMetricsController to avoid route ordering
 * conflicts with the dynamic :id param.
 */
@Controller({ path: 'sprints/contributors', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class SprintPersonalMetricsController {
  constructor(private readonly sprintMetricsService: SprintMetricsService) {}

  /**
   * GET /api/v1/sprints/contributors/:contributorId/metrics
   * Returns personal sprint metrics for a specific contributor.
   * CASL enforces that contributors can only view their own metrics.
   */
  @Get(':contributorId/metrics')
  @CheckAbility((ability) => ability.can(Action.Read, 'SprintMetric'))
  async getPersonalMetrics(
    @Param('contributorId') contributorId: string,
    @CurrentUser('id') userId: string,
    @Req() req?: Request & { correlationId?: string },
  ) {
    // Enforce field-level CASL: contributors can only read their own SprintMetric
    // Admins and working group leads bypass this (their ability has no field constraint)
    const ability = (req as unknown as Record<string, unknown>)?.ability as
      | { can: (action: unknown, subject: unknown) => boolean }
      | undefined;

    if (ability) {
      // Import subject helper inline to avoid circular dependency
      const { subject } = await import('@casl/ability');
      const canRead = ability.can(Action.Read, subject('SprintMetric', { contributorId }) as never);
      if (!canRead) {
        throw new ForbiddenException('You can only view your own sprint metrics');
      }
    }

    if (!contributorId || contributorId.length < 10) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid contributor ID',
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await this.sprintMetricsService.getPersonalMetrics(contributorId);

    return createSuccessResponse(data, req?.correlationId ?? '');
  }
}

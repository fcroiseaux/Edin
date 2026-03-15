import { Controller, Get, Param, Req, UseGuards, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { SprintEnrichmentService } from './sprint-enrichment.service.js';
import { Action, ERROR_CODES } from '@edin/shared';
import type { Request } from 'express';

@Controller({ path: 'sprints', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class SprintEnrichmentController {
  constructor(private readonly sprintEnrichmentService: SprintEnrichmentService) {}

  /**
   * GET /api/v1/sprints/contributions/:contributionId/sprint-context
   * Returns sprint contexts for a specific contribution.
   */
  @Get('contributions/:contributionId/sprint-context')
  @CheckAbility((ability) => ability.can(Action.Read, 'SprintMetric'))
  async getContributionSprintContext(
    @Param('contributionId') contributionId: string,
    @Req() req?: Request & { correlationId?: string },
  ) {
    if (!contributionId || contributionId.length < 10) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid contribution ID',
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await this.sprintEnrichmentService.getContributionSprintContexts(contributionId);

    return createSuccessResponse(data, req?.correlationId ?? '');
  }

  /**
   * GET /api/v1/sprints/:sprintId/contributions
   * Returns all enriched contributions for a sprint.
   */
  @Get(':sprintId/contributions')
  @CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))
  async getSprintContributions(
    @Param('sprintId') sprintId: string,
    @Req() req?: Request & { correlationId?: string },
  ) {
    if (!sprintId) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Sprint ID is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await this.sprintEnrichmentService.getSprintContributions(sprintId);

    return createSuccessResponse(data, req?.correlationId ?? '');
  }
}

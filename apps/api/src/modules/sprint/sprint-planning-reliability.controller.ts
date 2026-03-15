import { Controller, Get, Param, Query, Req, UseGuards, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { SprintPlanningReliabilityService } from './sprint-planning-reliability.service.js';
import {
  Action,
  ERROR_CODES,
  planningReliabilityQuerySchema,
  crossDomainCollaborationQuerySchema,
} from '@edin/shared';
import type { Request } from 'express';

@Controller({ path: 'sprints', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class SprintPlanningReliabilityController {
  constructor(private readonly reliabilityService: SprintPlanningReliabilityService) {}

  /**
   * GET /api/v1/sprints/reliability
   * Returns planning reliability summary for all contributors.
   */
  @Get('reliability')
  @CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))
  async getReliabilitySummary(
    @Query() query: Record<string, unknown>,
    @Req() req?: Request & { correlationId?: string },
  ) {
    const parsed = planningReliabilityQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        `Invalid query parameters: ${parsed.error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await this.reliabilityService.getReliabilitySummary({
      domain: parsed.data.domain,
      limit: parsed.data.limit,
    });

    return createSuccessResponse(data, req?.correlationId ?? '');
  }

  /**
   * GET /api/v1/sprints/reliability/:contributorId
   * Returns planning reliability for a specific contributor.
   */
  @Get('reliability/:contributorId')
  @CheckAbility((ability) => ability.can(Action.Read, 'SprintMetric'))
  async getContributorReliability(
    @Param('contributorId') contributorId: string,
    @Query('limit') limit?: string,
    @Req() req?: Request & { correlationId?: string },
  ) {
    if (!contributorId || contributorId.length < 10) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid contributor ID',
        HttpStatus.BAD_REQUEST,
      );
    }

    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const data = await this.reliabilityService.getContributorReliability(
      contributorId,
      parsedLimit && !isNaN(parsedLimit) ? parsedLimit : undefined,
    );

    return createSuccessResponse(data, req?.correlationId ?? '');
  }

  /**
   * GET /api/v1/sprints/collaborations
   * Returns cross-domain collaboration events.
   */
  @Get('collaborations')
  @CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))
  async getCollaborations(
    @Query() query: Record<string, unknown>,
    @Req() req?: Request & { correlationId?: string },
  ) {
    const parsed = crossDomainCollaborationQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        `Invalid query parameters: ${parsed.error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const data = await this.reliabilityService.getCollaborations({
      sprintId: parsed.data.sprintId,
      limit: parsed.data.limit,
    });

    return createSuccessResponse(data, req?.correlationId ?? '');
  }

  /**
   * GET /api/v1/sprints/collaborations/summary
   * Returns collaboration summary with domain pair counts.
   */
  @Get('collaborations/summary')
  @CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))
  async getCollaborationSummary(@Req() req?: Request & { correlationId?: string }) {
    const data = await this.reliabilityService.getCollaborationSummary();

    return createSuccessResponse(data, req?.correlationId ?? '');
  }
}

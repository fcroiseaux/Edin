import { Controller, Get, Query, Req, Sse, UseGuards, Logger, HttpStatus } from '@nestjs/common';
import { Observable } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { Action } from '../auth/casl/action.enum.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ERROR_CODES } from '@edin/shared';
import { ActivityService, SPRINT_EVENT_TYPES } from './activity.service.js';
import { ActivitySseService } from './activity-sse.service.js';
import { activityFeedQuerySchema } from './dto/activity-feed-query.dto.js';
import { randomUUID } from 'crypto';
import type { AppAbility } from '../auth/casl/app-ability.type.js';

@Controller({ path: 'activity', version: '1' })
export class ActivityController {
  private readonly logger = new Logger(ActivityController.name);

  constructor(
    private readonly activityService: ActivityService,
    private readonly activitySseService: ActivitySseService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'Activity'))
  async getFeed(@Query() rawQuery: Record<string, unknown>, @Req() req: Request) {
    const correlationId = randomUUID();
    const parsed = activityFeedQuerySchema.safeParse(rawQuery);

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

    const ability = (req as Request & { ability?: AppAbility }).ability;
    const canReadSprint = ability?.can(Action.Read, 'SprintDashboard') ?? false;
    const excludeEventTypes = canReadSprint ? [] : [...SPRINT_EVENT_TYPES];

    const result = await this.activityService.getFeed({
      ...parsed.data,
      excludeEventTypes,
    });

    return createSuccessResponse(result.items, correlationId, result.pagination);
  }

  @Sse('stream')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'Activity'))
  stream(@Req() req: Request): Observable<MessageEvent> {
    const ability = (req as Request & { ability?: AppAbility }).ability;
    const canReadSprint = ability?.can(Action.Read, 'SprintDashboard') ?? false;
    const excludeEventTypes = canReadSprint ? undefined : [...SPRINT_EVENT_TYPES];

    this.logger.log('Activity SSE stream established', { module: 'activity' });
    return this.activitySseService.createStream(excludeEventTypes);
  }

  @Get('public')
  async getPublicFeed(@Query() rawQuery: Record<string, unknown>) {
    const correlationId = randomUUID();
    const parsed = activityFeedQuerySchema.safeParse(rawQuery);

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

    const result = await this.activityService.getPublicFeed({
      ...parsed.data,
      excludeEventTypes: [...SPRINT_EVENT_TYPES],
    });

    return createSuccessResponse(result.items, correlationId, result.pagination);
  }
}

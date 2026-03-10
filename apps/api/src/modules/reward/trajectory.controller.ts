import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { TrajectoryService } from './trajectory.service.js';
import { ERROR_CODES } from '@edin/shared';
import type { TrajectoryTimeRange } from '@edin/shared';
import type { Request } from 'express';

const VALID_TIME_RANGES = new Set<string>(['30d', 'quarter', 'year', 'all']);

@Controller({ path: 'rewards/trajectory', version: '1' })
@UseGuards(JwtAuthGuard)
export class TrajectoryController {
  constructor(private readonly trajectoryService: TrajectoryService) {}

  /**
   * GET /api/v1/rewards/trajectory — contributor's reward trajectory visualization data.
   */
  @Get()
  async getTrajectory(
    @CurrentUser('id') userId: string,
    @Query('timeRange') timeRange: string | undefined,
    @Query('cursor') cursor: string | undefined,
    @Query('limit') limit: string | undefined,
    @Req() req: Request & { correlationId?: string },
  ) {
    const resolvedTimeRange = timeRange ?? 'year';

    if (!VALID_TIME_RANGES.has(resolvedTimeRange)) {
      throw new DomainException(
        ERROR_CODES.TRAJECTORY_INVALID_TIME_RANGE,
        `Invalid time range: ${resolvedTimeRange}. Must be one of: 30d, quarter, year, all`,
        400,
      );
    }

    // Validate cursor is a valid ISO date if provided
    if (cursor && isNaN(new Date(cursor).getTime())) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid cursor: must be a valid ISO date string',
        400,
      );
    }

    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200) : 50;

    const result = await this.trajectoryService.getTrajectory(
      userId,
      resolvedTimeRange as TrajectoryTimeRange,
      cursor,
      parsedLimit,
    );

    return createSuccessResponse(
      {
        points: result.points,
        summary: result.summary,
        projected: result.projected,
      },
      req.correlationId ?? '',
      {
        total: result.points.length,
        hasMore: result.hasMore,
        cursor: result.nextCursor ?? null,
      },
    );
  }
}

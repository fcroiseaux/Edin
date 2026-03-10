import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { Action } from '@edin/shared';
import { AdminContributorsService } from './contributors.service.js';
import type { Request } from 'express';

@Controller({ path: 'admin/contributors', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class AdminContributorsController {
  constructor(private readonly contributorsService: AdminContributorsService) {}

  @Get()
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async listContributors(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('domain') domain?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limitStr?: string,
    @Req() req?: Request & { correlationId?: string },
  ) {
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    const result = await this.contributorsService.list({
      search,
      role,
      domain,
      cursor,
      limit: Number.isNaN(limit) ? undefined : limit,
    });

    return createSuccessResponse(result.data, req?.correlationId ?? '', {
      cursor: result.pagination.nextCursor,
      hasMore: result.pagination.hasMore,
      total: result.total,
    });
  }
}

import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { AuditLogsService } from './audit-logs.service.js';
import { Action } from '@edin/shared';
import type { Request } from 'express';

@Controller({ path: 'admin/audit-logs', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  /**
   * GET /api/v1/admin/audit-logs — paginated, filterable audit log entries.
   */
  @Get()
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async listAuditLogs(
    @Query('eventType') eventType?: string,
    @Query('actorId') actorId?: string,
    @Query('targetId') targetId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('correlationId') correlationId?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limitStr?: string,
    @Req() req?: Request & { correlationId?: string },
  ) {
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    const result = await this.auditLogsService.list({
      eventType,
      actorId,
      targetId,
      startDate,
      endDate,
      correlationId,
      cursor,
      limit: Number.isNaN(limit) ? undefined : limit,
    });
    return createSuccessResponse(result.data, req?.correlationId ?? '', result.pagination);
  }
}

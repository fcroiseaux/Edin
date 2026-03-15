import { Controller, Get, Query, Req, UseGuards, HttpStatus, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { Action, ERROR_CODES, zenhubSyncLogQuerySchema } from '@edin/shared';
import { ZenhubSyncLogService } from './zenhub-sync-log.service.js';
import type { Request } from 'express';

@Controller({ path: 'admin/zenhub-sync-logs', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class ZenhubSyncLogController {
  private readonly logger = new Logger(ZenhubSyncLogController.name);

  constructor(private readonly zenhubSyncLogService: ZenhubSyncLogService) {}

  @Get('health')
  @CheckAbility((ability) => ability.can(Action.Manage, 'IntegrationConfig'))
  async getHealthSummary(@Req() req: Request & { correlationId?: string }) {
    const health = await this.zenhubSyncLogService.getHealthSummary();
    return createSuccessResponse(health, req.correlationId ?? '');
  }

  @Get()
  @CheckAbility((ability) => ability.can(Action.Manage, 'IntegrationConfig'))
  async getSyncLogs(@Query() query: unknown, @Req() req: Request & { correlationId?: string }) {
    const parsed = zenhubSyncLogQuerySchema.safeParse(query);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid sync log query parameters',
        HttpStatus.BAD_REQUEST,
        details,
      );
    }

    const result = await this.zenhubSyncLogService.getSyncLogs(parsed.data);

    return createSuccessResponse(result.data, req.correlationId ?? '', {
      cursor: result.pagination.cursor,
      hasMore: result.pagination.hasMore,
      total: result.data.length,
    });
  }
}

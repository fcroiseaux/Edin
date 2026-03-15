import {
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Param,
  Body,
  Req,
  UseGuards,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import {
  Action,
  ERROR_CODES,
  updateZenhubAlertConfigSchema,
  zenhubSyncConflictQuerySchema,
  resolveZenhubSyncConflictSchema,
} from '@edin/shared';
import type { ErrorCode } from '@edin/shared';
import { ZenhubAlertsService, ConflictResolutionError } from './zenhub-alerts.service.js';
import type { Request } from 'express';

@Controller({ path: 'admin/zenhub-alerts', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class ZenhubAlertsController {
  private readonly logger = new Logger(ZenhubAlertsController.name);

  constructor(private readonly zenhubAlertsService: ZenhubAlertsService) {}

  @Get('config')
  @CheckAbility((ability) => ability.can(Action.Manage, 'IntegrationConfig'))
  async getAlertConfig(@Req() req: Request & { correlationId?: string }) {
    const config = await this.zenhubAlertsService.getAlertConfig();
    return createSuccessResponse(config, req.correlationId ?? '');
  }

  @Patch('config')
  @CheckAbility((ability) => ability.can(Action.Manage, 'IntegrationConfig'))
  async updateAlertConfig(
    @Body() body: unknown,
    @CurrentUser('id') adminId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const parsed = updateZenhubAlertConfigSchema.safeParse(body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid alert configuration',
        HttpStatus.BAD_REQUEST,
        details,
      );
    }

    const config = await this.zenhubAlertsService.updateAlertConfig(
      parsed.data,
      adminId,
      req.correlationId,
    );
    return createSuccessResponse(config, req.correlationId ?? '');
  }

  @Get('conflicts')
  @CheckAbility((ability) => ability.can(Action.Manage, 'IntegrationConfig'))
  async getSyncConflicts(
    @Query() query: unknown,
    @Req() req: Request & { correlationId?: string },
  ) {
    const parsed = zenhubSyncConflictQuerySchema.safeParse(query);
    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid sync conflict query parameters',
        HttpStatus.BAD_REQUEST,
        details,
      );
    }

    const result = await this.zenhubAlertsService.getSyncConflicts(parsed.data);
    return createSuccessResponse(result.data, req.correlationId ?? '', {
      cursor: result.pagination.cursor,
      hasMore: result.pagination.hasMore,
      total: result.data.length,
    });
  }

  @Patch('conflicts/:id/resolve')
  @CheckAbility((ability) => ability.can(Action.Manage, 'IntegrationConfig'))
  async resolveConflict(
    @Param('id') conflictId: string,
    @Body() body: unknown,
    @CurrentUser('id') adminId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const parsed = resolveZenhubSyncConflictSchema.safeParse(body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid conflict resolution input',
        HttpStatus.BAD_REQUEST,
        details,
      );
    }

    try {
      const result = await this.zenhubAlertsService.resolveConflict(
        conflictId,
        parsed.data,
        adminId,
        req.correlationId,
      );
      return createSuccessResponse(result, req.correlationId ?? '');
    } catch (error) {
      if (error instanceof ConflictResolutionError) {
        const statusCode =
          error.code === 'ZENHUB_SYNC_CONFLICT_NOT_FOUND'
            ? HttpStatus.NOT_FOUND
            : HttpStatus.CONFLICT;
        throw new DomainException(error.code as ErrorCode, error.message, statusCode);
      }
      throw error;
    }
  }

  @Post('dismiss/:alertId')
  @CheckAbility((ability) => ability.can(Action.Manage, 'IntegrationConfig'))
  async dismissAlert(
    @Param('alertId') alertId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    await this.zenhubAlertsService.dismissAlert(alertId);
    return createSuccessResponse({ dismissed: true }, req.correlationId ?? '');
  }

  @Get()
  @CheckAbility((ability) => ability.can(Action.Manage, 'IntegrationConfig'))
  async getActiveAlerts(@Req() req: Request & { correlationId?: string }) {
    const alerts = await this.zenhubAlertsService.getActiveAlerts();
    return createSuccessResponse(alerts, req.correlationId ?? '');
  }
}

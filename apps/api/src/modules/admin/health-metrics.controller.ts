import { Controller, Get, Post, Param, Req, UseGuards, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { HealthMetricsService } from './health-metrics.service.js';
import { AlertsService } from './alerts.service.js';
import { Action, ERROR_CODES } from '@edin/shared';
import type { Request } from 'express';

@Controller({ path: 'admin/health', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class HealthMetricsController {
  constructor(
    private readonly healthMetricsService: HealthMetricsService,
    private readonly alertsService: AlertsService,
  ) {}

  /**
   * GET /api/v1/admin/health/metrics — aggregated community vitals + KPIs.
   */
  @Get('metrics')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async getHealthMetrics(@Req() req: Request & { correlationId?: string }) {
    const metrics = await this.healthMetricsService.getHealthMetrics();
    return createSuccessResponse(metrics, req.correlationId ?? '');
  }

  /**
   * GET /api/v1/admin/health/alerts — active system health alerts.
   */
  @Get('alerts')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async getAlerts(@Req() req: Request & { correlationId?: string }) {
    const alerts = await this.alertsService.getActiveAlerts();
    return createSuccessResponse(alerts, req.correlationId ?? '');
  }

  /**
   * POST /api/v1/admin/health/alerts/:id/dismiss — dismiss an alert.
   */
  @Post('alerts/:id/dismiss')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async dismissAlert(
    @Param('id') alertId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const dismissed = await this.alertsService.dismissAlert(alertId);

    if (!dismissed) {
      throw new DomainException(
        ERROR_CODES.ADMIN_ALERT_NOT_FOUND,
        `Alert ${alertId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return createSuccessResponse({ dismissed: true }, req.correlationId ?? '');
  }
}

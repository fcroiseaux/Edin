import { Controller, Get, Param, Query, Req, Res, UseGuards, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { SprintMetricsService } from './sprint-metrics.service.js';
import {
  Action,
  ERROR_CODES,
  sprintMetricsQuerySchema,
  sprintBurndownQuerySchema,
  sprintScopeChangesQuerySchema,
  contributorTrendsQuerySchema,
  sprintExportQuerySchema,
} from '@edin/shared';
import type { Request, Response } from 'express';

@Controller({ path: 'sprints', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class SprintMetricsController {
  constructor(private readonly sprintMetricsService: SprintMetricsService) {}

  /**
   * GET /api/v1/sprints — list sprint metrics with pagination.
   */
  @Get()
  @CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))
  async listSprints(
    @Query('domain') domain?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Req() req?: Request & { correlationId?: string },
  ) {
    const parsed = sprintMetricsQuerySchema.safeParse({ domain, limit, cursor });
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      );
    }

    const result = await this.sprintMetricsService.listSprints({
      domain: parsed.data.domain,
      limit: parsed.data.limit,
      cursor: parsed.data.cursor,
    });

    return createSuccessResponse(result.data, req?.correlationId ?? '', {
      cursor: result.pagination.cursor,
      hasMore: result.pagination.hasMore,
      total: result.data.length,
    });
  }

  /**
   * GET /api/v1/sprints/velocity — chart-ready velocity data.
   */
  @Get('velocity')
  @CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))
  async getVelocityData(
    @Query('domain') domain?: string,
    @Query('limit') limit?: string,
    @Req() req?: Request & { correlationId?: string },
  ) {
    const parsed = sprintMetricsQuerySchema.safeParse({ domain, limit });
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      );
    }

    const data = await this.sprintMetricsService.getVelocityChartData({
      domain: parsed.data.domain,
      limit: parsed.data.limit,
    });

    return createSuccessResponse(data, req?.correlationId ?? '');
  }

  /**
   * GET /api/v1/sprints/burndown/:sprintId — burndown chart data for a sprint.
   */
  @Get('burndown/:sprintId')
  @CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))
  async getBurndownData(
    @Param('sprintId') sprintId: string,
    @Query('domain') domain?: string,
    @Req() req?: Request & { correlationId?: string },
  ) {
    const parsed = sprintBurndownQuerySchema.safeParse({ domain });
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      );
    }

    // Look up the sprint metric to get the sprintId for burndown data
    const metric = await this.sprintMetricsService.getSprintMetricById(sprintId);
    if (!metric) {
      return createSuccessResponse([], req?.correlationId ?? '');
    }

    const data = await this.sprintMetricsService.getBurndownChartData(
      metric.sprintId,
      parsed.data.domain,
    );

    return createSuccessResponse(data, req?.correlationId ?? '');
  }

  /**
   * GET /api/v1/sprints/contributors/combined — combined sprint + evaluation metrics per contributor.
   * MUST be before contributors and :id routes.
   */
  @Get('contributors/combined')
  @CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))
  async getCombinedContributorMetrics(
    @Query('domain') domain?: string,
    @Query('limit') limit?: string,
    @Req() req?: Request & { correlationId?: string },
  ) {
    const parsed = contributorTrendsQuerySchema.safeParse({ domain, limit });
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      );
    }

    const data = await this.sprintMetricsService.getCombinedContributorMetrics({
      domain: parsed.data.domain,
      limit: parsed.data.limit,
    });

    return createSuccessResponse(data, req?.correlationId ?? '');
  }

  /**
   * GET /api/v1/sprints/export — download sprint report as CSV or PDF.
   * MUST be before :id route.
   */
  @Get('export')
  @CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))
  async exportSprintReport(
    @Query('format') format: string,
    @Query('domain') domain: string | undefined,
    @Query('limit') limit: string | undefined,
    @Res() res: Response,
  ) {
    const parsed = sprintExportQuerySchema.safeParse({ format, domain, limit });
    if (!parsed.success) {
      res.status(HttpStatus.BAD_REQUEST).json({
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Invalid query parameters',
          details: parsed.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
      });
      return;
    }

    const options = {
      domain: parsed.data.domain,
      limit: parsed.data.limit,
    };

    const timestamp = new Date().toISOString().split('T')[0];

    if (parsed.data.format === 'csv') {
      const csv = await this.sprintMetricsService.generateSprintReportCsv(options);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="sprint-report-${timestamp}.csv"`);
      res.send(csv);
    } else {
      const pdf = await this.sprintMetricsService.generateSprintReportPdf(options);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="sprint-report-${timestamp}.pdf"`);
      res.send(pdf);
    }
  }

  /**
   * GET /api/v1/sprints/contributors — contributor estimation accuracy trends.
   * MUST be before :id route to prevent "contributors" matching as dynamic param.
   */
  @Get('contributors')
  @CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))
  async getContributorTrends(
    @Query('domain') domain?: string,
    @Query('limit') limit?: string,
    @Req() req?: Request & { correlationId?: string },
  ) {
    const parsed = contributorTrendsQuerySchema.safeParse({ domain, limit });
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      );
    }

    const data = await this.sprintMetricsService.getContributorAccuracyTrends({
      domain: parsed.data.domain,
      limit: parsed.data.limit,
    });

    return createSuccessResponse(data, req?.correlationId ?? '');
  }

  /**
   * GET /api/v1/sprints/:sprintId/scope-changes — scope change history for a sprint.
   */
  @Get(':sprintId/scope-changes')
  @CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))
  async getScopeChanges(
    @Param('sprintId') sprintId: string,
    @Query('domain') domain?: string,
    @Query('limit') limit?: string,
    @Req() req?: Request & { correlationId?: string },
  ) {
    const parsed = sprintScopeChangesQuerySchema.safeParse({ domain, limit });
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      );
    }

    const data = await this.sprintMetricsService.getScopeChangeHistory(sprintId, {
      domain: parsed.data.domain,
      limit: parsed.data.limit,
    });

    return createSuccessResponse(data, req?.correlationId ?? '');
  }

  /**
   * GET /api/v1/sprints/:id — single sprint metric detail.
   */
  @Get(':id')
  @CheckAbility((ability) => ability.can(Action.Read, 'SprintDashboard'))
  async getSprintDetail(
    @Param('id') id: string,
    @Req() req?: Request & { correlationId?: string },
  ) {
    const metric = await this.sprintMetricsService.getSprintMetricById(id);
    if (!metric) {
      throw new DomainException(
        ERROR_CODES.SPRINT_CONTRIBUTION_NOT_FOUND,
        `Sprint metric ${id} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    return createSuccessResponse(metric, req?.correlationId ?? '');
  }
}

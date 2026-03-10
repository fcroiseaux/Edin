import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Req,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ReportsService } from './reports.service.js';
import { Action, ERROR_CODES } from '@edin/shared';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, sep } from 'path';

const createReportSchema = z.object({
  startDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z
    .string()
    .datetime({ offset: true })
    .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  kpiIds: z.array(z.string()).min(1),
  format: z.enum(['csv', 'json']),
});

const paginationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

@Controller({ path: 'admin/reports', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * POST /api/v1/admin/reports — create a new report generation job.
   */
  @Post()
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async createReport(
    @Body() body: unknown,
    @CurrentUser('id') userId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const parsed = createReportSchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid report configuration',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
      );
    }

    const report = await this.reportsService.createReport(parsed.data, userId);
    return createSuccessResponse(report, req.correlationId ?? '');
  }

  /**
   * GET /api/v1/admin/reports — list generated reports.
   */
  @Get()
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async listReports(
    @Query() query: Record<string, unknown>,
    @Req() req: Request & { correlationId?: string },
  ) {
    const parsed = paginationQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        HttpStatus.BAD_REQUEST,
        parsed.error.issues.map((e) => ({ field: e.path.join('.'), message: e.message })),
      );
    }

    const result = await this.reportsService.listReports(parsed.data.cursor, parsed.data.limit);

    return createSuccessResponse(result.items, req.correlationId ?? '', {
      total: result.items.length,
      hasMore: result.hasMore,
      cursor:
        result.hasMore && result.items.length > 0 ? result.items[result.items.length - 1].id : null,
    });
  }

  /**
   * GET /api/v1/admin/reports/:id/download — download a generated report.
   */
  @Get(':id/download')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async downloadReport(@Param('id') reportId: string, @Res() res: Response) {
    const report = await this.reportsService.getReport(reportId);

    if (!report) {
      throw new DomainException(
        ERROR_CODES.ADMIN_REPORT_NOT_FOUND,
        `Report ${reportId} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    if (report.status !== 'completed') {
      throw new DomainException(
        ERROR_CODES.ADMIN_REPORT_NOT_READY,
        `Report ${reportId} is not yet ready (status: ${report.status})`,
        HttpStatus.CONFLICT,
      );
    }

    const ext = report.config.format;
    const reportsDir = resolve(process.cwd(), 'data', 'reports');
    const filePath = resolve(reportsDir, `${reportId}.${ext}`);

    if (!filePath.startsWith(reportsDir + sep)) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid report ID',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!existsSync(filePath)) {
      throw new DomainException(
        ERROR_CODES.ADMIN_REPORT_NOT_FOUND,
        'Report file not found on disk',
        HttpStatus.NOT_FOUND,
      );
    }

    const content = await readFile(filePath);
    const contentType = ext === 'json' ? 'application/json' : 'text/csv';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.${ext}"`);
    res.send(content);
  }
}

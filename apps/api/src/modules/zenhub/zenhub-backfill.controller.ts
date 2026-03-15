import { Controller, Post, Get, Body, Req, UseGuards, HttpStatus, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { Action, ERROR_CODES, triggerBackfillSchema } from '@edin/shared';
import { ZenhubBackfillService } from './zenhub-backfill.service.js';
import type { Request } from 'express';

@Controller({ path: 'admin/zenhub-backfill', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class ZenhubBackfillController {
  private readonly logger = new Logger(ZenhubBackfillController.name);

  constructor(private readonly backfillService: ZenhubBackfillService) {}

  @Post()
  @CheckAbility((ability) => ability.can(Action.Manage, 'IntegrationConfig'))
  async triggerBackfill(
    @Body() body: unknown,
    @CurrentUser('id') adminId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const parsed = triggerBackfillSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid backfill parameters',
        HttpStatus.BAD_REQUEST,
        details,
      );
    }

    const correlationId = req.correlationId ?? '';

    this.logger.log('Backfill requested', {
      adminId,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      correlationId,
    });

    const result = await this.backfillService.triggerBackfill(
      adminId,
      correlationId,
      parsed.data.startDate,
      parsed.data.endDate,
    );

    return createSuccessResponse(result, correlationId);
  }

  @Get('status')
  @CheckAbility((ability) => ability.can(Action.Manage, 'IntegrationConfig'))
  async getBackfillStatus(@Req() req: Request & { correlationId?: string }) {
    const status = await this.backfillService.getBackfillStatus();
    return createSuccessResponse(status, req.correlationId ?? '');
  }
}

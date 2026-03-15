import { Controller, Get, Patch, Body, Req, UseGuards, HttpStatus, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { Action, ERROR_CODES, updateZenhubConfigSchema } from '@edin/shared';
import { ZenhubConfigService } from './zenhub-config.service.js';
import type { Request } from 'express';

@Controller({ path: 'admin/zenhub-config', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class ZenhubConfigController {
  private readonly logger = new Logger(ZenhubConfigController.name);

  constructor(private readonly zenhubConfigService: ZenhubConfigService) {}

  @Get()
  @CheckAbility((ability) => ability.can(Action.Manage, 'IntegrationConfig'))
  async getConfig(@Req() req: Request & { correlationId?: string }) {
    const config = await this.zenhubConfigService.getConfig();
    return createSuccessResponse(config, req.correlationId ?? '');
  }

  @Patch()
  @CheckAbility((ability) => ability.can(Action.Manage, 'IntegrationConfig'))
  async updateConfig(
    @Body() body: unknown,
    @CurrentUser('id') adminId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const parsed = updateZenhubConfigSchema.safeParse(body);

    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid Zenhub configuration update',
        HttpStatus.BAD_REQUEST,
        details,
      );
    }

    this.logger.log('Zenhub config update requested', {
      adminId,
      updatedFields: Object.keys(parsed.data),
      correlationId: req.correlationId,
    });

    const config = await this.zenhubConfigService.updateConfig(
      parsed.data,
      adminId,
      req.correlationId,
    );

    return createSuccessResponse(config, req.correlationId ?? '');
  }
}

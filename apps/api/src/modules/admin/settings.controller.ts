import { Controller, Get, Patch, Param, Body, Req, UseGuards, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { Action, ERROR_CODES } from '@edin/shared';
import { SettingsAdminService } from './settings-admin.service.js';
import type { Request } from 'express';

@Controller({ path: 'admin/settings', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class AdminSettingsController {
  constructor(private readonly settingsAdminService: SettingsAdminService) {}

  @Get()
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async getAllSettings(@Req() req: Request & { correlationId?: string }) {
    const sections = await this.settingsAdminService.getAllSections();
    return createSuccessResponse({ sections }, req.correlationId ?? '');
  }

  @Get(':section')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async getSection(
    @Param('section') section: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    const sectionData = await this.settingsAdminService.getSection(section);
    return createSuccessResponse(sectionData, req.correlationId ?? '');
  }

  @Patch(':section')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async updateSection(
    @Param('section') section: string,
    @Body() body: unknown,
    @CurrentUser('id') adminId: string,
    @Req() req: Request & { correlationId?: string },
  ) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Request body must be a JSON object with setting key-value pairs',
        HttpStatus.BAD_REQUEST,
      );
    }

    const updates = body as Record<string, unknown>;
    const updated = await this.settingsAdminService.updateSection(
      section,
      updates,
      adminId,
      req.correlationId,
    );
    return createSuccessResponse(updated, req.correlationId ?? '');
  }
}

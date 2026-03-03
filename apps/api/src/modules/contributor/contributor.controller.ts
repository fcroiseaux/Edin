import { Controller, Patch, Param, Body, UseGuards, Req, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { ERROR_CODES } from '@edin/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { Action } from '../auth/casl/action.enum.js';
import { ContributorService } from './contributor.service.js';
import { updateRoleSchema } from './dto/update-role.dto.js';
import { designateFoundingSchema } from './dto/designate-founding.dto.js';

@Controller({ path: 'admin/contributors', version: '1' })
export class ContributorController {
  constructor(private readonly contributorService: ContributorService) {}

  @Patch(':contributorId/role')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async updateRole(
    @Param('contributorId') contributorId: string,
    @Body() body: unknown,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ) {
    const parsed = updateRoleSchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid role value',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    return this.contributorService.updateRole(
      contributorId,
      parsed.data,
      actorId,
      req.correlationId,
    );
  }

  @Patch(':contributorId/founding-status')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async designateFoundingContributor(
    @Param('contributorId') contributorId: string,
    @Body() body: unknown,
    @CurrentUser('id') actorId: string,
    @Req() req: Request,
  ) {
    const parsed = designateFoundingSchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid designation request',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    return this.contributorService.designateFoundingContributor(
      contributorId,
      parsed.data.reason,
      actorId,
      req.correlationId,
    );
  }
}

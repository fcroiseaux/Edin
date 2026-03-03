import { Controller, Get, Param, Patch, Body, UseGuards, Req, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { ERROR_CODES, contributorProfileSchema } from '@edin/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ContributorService } from './contributor.service.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller({ path: 'contributors', version: '1' })
export class ProfileController {
  constructor(private readonly contributorService: ContributorService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@CurrentUser('id') userId: string) {
    return this.contributorService.getProfile(userId);
  }

  @Get(':id')
  async getPublicProfile(@Param('id') id: string) {
    if (!UUID_REGEX.test(id)) {
      throw new DomainException(
        ERROR_CODES.CONTRIBUTOR_NOT_FOUND,
        'Contributor not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.contributorService.getPublicProfile(id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMyProfile(
    @CurrentUser('id') userId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = contributorProfileSchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid profile data',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    return this.contributorService.updateProfile(userId, parsed.data, req.correlationId);
  }
}

import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Req,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { ERROR_CODES } from '@edin/shared';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { Action } from '../auth/casl/action.enum.js';
import { AdmissionService } from './admission.service.js';
import { createApplicationSchema } from './dto/create-application.dto.js';
import { submitReviewSchema } from './dto/submit-review.dto.js';
import { updateApplicationStatusSchema } from './dto/update-application-status.dto.js';
import { assignReviewerSchema } from './dto/assign-reviewer.dto.js';
import { listApplicationsQuerySchema } from './dto/list-applications-query.dto.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';

@Controller({ path: 'admission', version: '1' })
export class AdmissionController {
  constructor(private readonly admissionService: AdmissionService) {}

  // ─── Public endpoints (from Story 3-1) ────────────────────────────────

  @Post('applications')
  @Throttle({ default: { ttl: 3600000, limit: 5 } })
  async createApplication(@Body() body: unknown, @Req() req: Request) {
    const parsed = createApplicationSchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid application data',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    if (!parsed.data.gdprConsent) {
      throw new DomainException(
        ERROR_CODES.GDPR_CONSENT_REQUIRED,
        'GDPR consent is required to submit an application',
        HttpStatus.BAD_REQUEST,
      );
    }

    const contributorId =
      req.user && typeof req.user === 'object' && 'id' in req.user
        ? String(req.user.id)
        : undefined;

    return this.admissionService.createApplication(parsed.data, req.correlationId, contributorId);
  }

  @Get('applications/:id')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  async getApplicationStatus(@Param('id') id: string, @Req() req: Request) {
    const application = await this.admissionService.getApplicationById(id, req.correlationId);
    return application;
  }

  @Get('micro-tasks/:domain')
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  async getMicroTaskByDomain(@Param('domain') domain: string, @Req() req: Request) {
    return this.admissionService.getActiveMicroTaskByDomain(domain, req.correlationId);
  }

  // ─── Authenticated admin endpoints (Story 3-2) ────────────────────────

  @Get('applications')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Manage, 'Application'))
  async listApplications(@Query() query: unknown, @Req() req: Request) {
    const parsed = listApplicationsQuerySchema.safeParse(query);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const result = await this.admissionService.listApplications(parsed.data, req.correlationId);

    return createSuccessResponse(result.items, req.correlationId || 'unknown', result.pagination);
  }

  @Get('applications/:id/full')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility(
    (ability) =>
      ability.can(Action.Manage, 'Application') || ability.can(Action.Create, 'ApplicationReview'),
  )
  async getApplicationFull(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as CurrentUserPayload | undefined;

    return this.admissionService.getApplicationFull(id, req.correlationId, user?.id, user?.role);
  }

  @Post('applications/:id/reviewers')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Manage, 'Application'))
  async assignReviewer(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const parsed = assignReviewerSchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid reviewer assignment data',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    return this.admissionService.assignReviewer(
      id,
      parsed.data.contributorId,
      user.id,
      req.correlationId,
    );
  }

  @Post('applications/:id/reviews')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Create, 'ApplicationReview'))
  async submitReview(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const parsed = submitReviewSchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid review data',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    return this.admissionService.submitReview(id, user.id, parsed.data, req.correlationId);
  }

  @Patch('applications/:id/status')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Manage, 'Application'))
  async updateApplicationStatus(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const parsed = updateApplicationStatusSchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid status update data',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    if (parsed.data.status === 'APPROVED') {
      return this.admissionService.approveApplication(
        id,
        user.id,
        parsed.data.reason,
        req.correlationId,
      );
    }

    if (parsed.data.status === 'REQUEST_MORE_INFO') {
      return this.admissionService.requestMoreInfo(
        id,
        user.id,
        parsed.data.reason!,
        req.correlationId,
      );
    }

    return this.admissionService.declineApplication(
      id,
      user.id,
      parsed.data.reason!,
      req.correlationId,
    );
  }

  @Get('reviewers')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Manage, 'Application'))
  async listReviewers(@Query('domain') domain: string | undefined, @Req() req: Request) {
    return this.admissionService.listAvailableReviewers(domain, req.correlationId);
  }

  @Get('my-reviews')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Create, 'ApplicationReview'))
  async getMyReviews(@CurrentUser() user: CurrentUserPayload, @Req() req: Request) {
    return this.admissionService.getMyReviews(user.id, req.correlationId);
  }
}

import { Controller, Post, Param, Body, Req, HttpStatus, UseGuards, Logger } from '@nestjs/common';
import type { Request } from 'express';
import { ERROR_CODES } from '@edin/shared';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { Action } from '../auth/casl/action.enum.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditService } from '../compliance/audit/audit.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RedisService } from '../../common/redis/redis.service.js';
import { disputeCollaborationSchema } from '@edin/shared';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('collaborations')
@ApiBearerAuth()
@Controller({ path: 'contributors/me/collaborations', version: '1' })
export class CollaborationController {
  private readonly logger = new Logger(CollaborationController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly redisService: RedisService,
  ) {}

  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Update, 'ContributionCollaboration'))
  @ApiOperation({ summary: 'Confirm a collaboration attribution' })
  @ApiParam({ name: 'id', type: String, description: 'Collaboration identifier' })
  @ApiResponse({ status: 200, description: 'Collaboration confirmed successfully' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Not your collaboration' })
  @ApiResponse({ status: 404, description: 'Collaboration not found' })
  @ApiResponse({ status: 409, description: 'Collaboration already confirmed' })
  async confirmCollaboration(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const contributor = await this.prisma.contributor.findUnique({
      where: { id: user.id },
      select: { id: true },
    });

    if (!contributor) {
      throw new DomainException(
        ERROR_CODES.CONTRIBUTOR_NOT_FOUND,
        'Contributor profile not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const collaboration = await this.prisma.contributionCollaboration.findUnique({
      where: { id },
    });

    if (!collaboration) {
      throw new DomainException(
        ERROR_CODES.COLLABORATION_NOT_FOUND,
        'Collaboration not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (collaboration.contributorId !== contributor.id) {
      throw new DomainException(
        ERROR_CODES.FORBIDDEN,
        'You can only confirm your own collaborations',
        HttpStatus.FORBIDDEN,
      );
    }

    if (collaboration.status === 'CONFIRMED') {
      throw new DomainException(
        ERROR_CODES.COLLABORATION_ALREADY_CONFIRMED,
        'Collaboration has already been confirmed',
        HttpStatus.CONFLICT,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.contributionCollaboration.update({
        where: { id },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
        },
      });

      await this.auditService.log(
        {
          actorId: contributor.id,
          action: 'contribution.collaboration.confirmed',
          entityType: 'ContributionCollaboration',
          entityId: id,
          details: { contributionId: collaboration.contributionId },
          correlationId: req.correlationId,
        },
        tx,
      );

      return result;
    });

    this.eventEmitter.emit('contribution.collaboration.confirmed', {
      collaborationId: id,
      contributionId: collaboration.contributionId,
      contributorId: contributor.id,
      correlationId: req.correlationId,
    });

    const channel = `contributions:contributor:${contributor.id}`;
    await this.redisService.publish(
      channel,
      JSON.stringify({
        type: 'contribution.collaboration.confirmed',
        contributionId: collaboration.contributionId,
      }),
    );

    this.logger.log('Collaboration confirmed', {
      collaborationId: id,
      contributorId: contributor.id,
      correlationId: req.correlationId,
    });

    return createSuccessResponse(
      {
        id: updated.id,
        contributionId: updated.contributionId,
        contributorId: updated.contributorId,
        role: updated.role,
        splitPercentage: updated.splitPercentage,
        status: updated.status,
        confirmedAt: updated.confirmedAt?.toISOString() ?? null,
      },
      req.correlationId || 'unknown',
    );
  }

  @Post(':id/dispute')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Update, 'ContributionCollaboration'))
  @ApiOperation({ summary: 'Dispute a collaboration attribution' })
  @ApiParam({ name: 'id', type: String, description: 'Collaboration identifier' })
  @ApiBody({ description: 'Dispute comment (min 10 chars)' })
  @ApiResponse({ status: 200, description: 'Collaboration disputed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid dispute comment' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Not your collaboration' })
  @ApiResponse({ status: 404, description: 'Collaboration not found' })
  async disputeCollaboration(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const parsed = disputeCollaborationSchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid dispute data',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const contributor = await this.prisma.contributor.findUnique({
      where: { id: user.id },
      select: { id: true },
    });

    if (!contributor) {
      throw new DomainException(
        ERROR_CODES.CONTRIBUTOR_NOT_FOUND,
        'Contributor profile not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const collaboration = await this.prisma.contributionCollaboration.findUnique({
      where: { id },
    });

    if (!collaboration) {
      throw new DomainException(
        ERROR_CODES.COLLABORATION_NOT_FOUND,
        'Collaboration not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (collaboration.contributorId !== contributor.id) {
      throw new DomainException(
        ERROR_CODES.FORBIDDEN,
        'You can only dispute your own collaborations',
        HttpStatus.FORBIDDEN,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.contributionCollaboration.update({
        where: { id },
        data: {
          status: 'DISPUTED',
          disputeComment: parsed.data.comment,
        },
      });

      await this.auditService.log(
        {
          actorId: contributor.id,
          action: 'contribution.collaboration.disputed',
          entityType: 'ContributionCollaboration',
          entityId: id,
          details: {
            contributionId: collaboration.contributionId,
            comment: parsed.data.comment,
          },
          correlationId: req.correlationId,
        },
        tx,
      );

      return result;
    });

    this.eventEmitter.emit('contribution.collaboration.disputed', {
      collaborationId: id,
      contributionId: collaboration.contributionId,
      contributorId: contributor.id,
      comment: parsed.data.comment,
      correlationId: req.correlationId,
    });

    this.logger.log('Collaboration disputed', {
      collaborationId: id,
      contributorId: contributor.id,
      correlationId: req.correlationId,
    });

    return createSuccessResponse(
      {
        id: updated.id,
        contributionId: updated.contributionId,
        contributorId: updated.contributorId,
        role: updated.role,
        splitPercentage: updated.splitPercentage,
        status: updated.status,
        disputeComment: updated.disputeComment,
      },
      req.correlationId || 'unknown',
    );
  }
}

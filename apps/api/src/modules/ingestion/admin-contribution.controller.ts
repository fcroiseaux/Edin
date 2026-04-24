import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Req,
  HttpStatus,
  UseGuards,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { ERROR_CODES, overrideAttributionSchema } from '@edin/shared';
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
import { CollaborationDetectionService } from './services/collaboration-detection.service.js';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('admin-contributions')
@ApiBearerAuth()
@Controller({ path: 'admin/contributions', version: '1' })
export class AdminContributionController {
  private readonly logger = new Logger(AdminContributionController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly redisService: RedisService,
    private readonly collaborationDetectionService: CollaborationDetectionService,
  ) {}

  @Get(':id/collaborations')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  @ApiOperation({ summary: 'List all collaborations for a contribution' })
  @ApiParam({ name: 'id', type: String, description: 'Contribution identifier' })
  @ApiResponse({ status: 200, description: 'Collaborations listed successfully' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Contribution not found' })
  async listCollaborations(@Param('id') id: string, @Req() req: Request) {
    const contribution = await this.prisma.contribution.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!contribution) {
      throw new DomainException(
        ERROR_CODES.NOT_FOUND,
        'Contribution not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const collaborations = await this.prisma.contributionCollaboration.findMany({
      where: { contributionId: id },
      include: {
        contributor: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: [{ isCurrent: 'desc' }, { createdAt: 'desc' }],
    });

    const data = collaborations.map((c) => ({
      id: c.id,
      contributionId: c.contributionId,
      contributorId: c.contributorId,
      contributorName: c.contributor.name,
      contributorAvatarUrl: c.contributor.avatarUrl,
      role: c.role,
      splitPercentage: c.splitPercentage,
      status: c.status,
      detectionSource: c.detectionSource,
      confirmedAt: c.confirmedAt?.toISOString() ?? null,
    }));

    return createSuccessResponse(data, req.correlationId || 'unknown');
  }

  @Patch(':id/attribution')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  @ApiOperation({ summary: 'Override attribution split for a contribution' })
  @ApiParam({ name: 'id', type: String, description: 'Contribution identifier' })
  @ApiBody({ description: 'New attributions with splits summing to 100' })
  @ApiResponse({ status: 200, description: 'Attribution overridden successfully' })
  @ApiResponse({ status: 400, description: 'Invalid attribution splits' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'Admin access required' })
  @ApiResponse({ status: 404, description: 'Contribution not found' })
  async overrideAttribution(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const parsed = overrideAttributionSchema.safeParse(body);
    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.ATTRIBUTION_SPLIT_INVALID,
        'Invalid attribution data',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const contribution = await this.prisma.contribution.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!contribution) {
      throw new DomainException(
        ERROR_CODES.NOT_FOUND,
        'Contribution not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const admin = await this.prisma.contributor.findUnique({
      where: { id: user.id },
      select: { id: true },
    });

    if (!admin) {
      throw new DomainException(
        ERROR_CODES.CONTRIBUTOR_NOT_FOUND,
        'Admin contributor profile not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const existingCollaborations = await this.prisma.contributionCollaboration.findMany({
      where: { contributionId: id, isCurrent: true },
    });

    const oldSplits = existingCollaborations.map((c) => ({
      contributorId: c.contributorId,
      splitPercentage: c.splitPercentage,
      role: c.role,
    }));

    const updatedCollaborations = await this.prisma.$transaction(async (tx) => {
      // Mark all existing records as OVERRIDDEN
      for (const existing of existingCollaborations) {
        await tx.contributionCollaboration.update({
          where: { id: existing.id },
          data: {
            status: 'OVERRIDDEN',
            overriddenById: admin.id,
            isCurrent: false,
          },
        });
      }

      // Update splits for specified contributors
      const results = [];
      for (const attribution of parsed.data.attributions) {
        const existing = existingCollaborations.find(
          (c) => c.contributorId === attribution.contributorId,
        );

        if (existing) {
          const updated = await tx.contributionCollaboration.create({
            data: {
              contributionId: id,
              contributorId: existing.contributorId,
              role: existing.role,
              splitPercentage: attribution.splitPercentage,
              status: 'OVERRIDDEN',
              detectionSource: 'ADMIN_OVERRIDE',
              overriddenById: admin.id,
              overrideReason: attribution.reason ?? null,
              isCurrent: true,
            },
          });
          results.push(updated);
        } else {
          const created = await tx.contributionCollaboration.create({
            data: {
              contributionId: id,
              contributorId: attribution.contributorId,
              role: 'CO_AUTHOR',
              splitPercentage: attribution.splitPercentage,
              status: 'OVERRIDDEN',
              detectionSource: 'ADMIN_OVERRIDE',
              overriddenById: admin.id,
              overrideReason: attribution.reason ?? null,
              isCurrent: true,
            },
          });
          results.push(created);
        }
      }

      await this.auditService.log(
        {
          actorId: admin.id,
          action: 'contribution.attribution.overridden',
          entityType: 'ContributionCollaboration',
          entityId: id,
          details: {
            oldSplits,
            newSplits: parsed.data.attributions,
          },
          correlationId: req.correlationId,
        },
        tx,
      );

      return results;
    });

    this.eventEmitter.emit('contribution.attribution.overridden', {
      contributionId: id,
      overriddenById: admin.id,
      attributions: parsed.data.attributions.map((a) => ({
        contributorId: a.contributorId,
        splitPercentage: a.splitPercentage,
      })),
      correlationId: req.correlationId,
    });

    // Publish SSE to affected contributors
    const affectedContributorIds = new Set([
      ...existingCollaborations.map((c) => c.contributorId),
      ...parsed.data.attributions.map((a) => a.contributorId),
    ]);

    for (const contributorId of affectedContributorIds) {
      const channel = `contributions:contributor:${contributorId}`;
      await this.redisService.publish(
        channel,
        JSON.stringify({
          type: 'contribution.attribution.overridden',
          contributionId: id,
        }),
      );
    }

    this.logger.log('Attribution overridden by admin', {
      contributionId: id,
      adminId: admin.id,
      attributionCount: parsed.data.attributions.length,
      correlationId: req.correlationId,
    });

    await this.collaborationDetectionService.updateAttributionMetrics(
      req.correlationId || 'unknown',
    );

    const data = updatedCollaborations.map((c) => ({
      id: c.id,
      contributionId: c.contributionId,
      contributorId: c.contributorId,
      role: c.role,
      splitPercentage: c.splitPercentage,
      status: c.status,
    }));

    return createSuccessResponse(data, req.correlationId || 'unknown');
  }
}

import { Controller, Get, Param, Query, Req, HttpStatus, UseGuards, Logger } from '@nestjs/common';
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
import { contributionListQuerySchema } from './dto/contribution-list-query.dto.js';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('contributions')
@ApiBearerAuth()
@Controller({ path: 'contributors/me/contributions', version: '1' })
export class ContributionController {
  private readonly logger = new Logger(ContributionController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'Contribution'))
  @ApiOperation({ summary: 'List the authenticated contributor contributions' })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: ['COMMIT', 'PULL_REQUEST', 'CODE_REVIEW'] })
  @ApiResponse({ status: 200, description: 'Contributor contributions returned successfully' })
  @ApiResponse({ status: 400, description: 'Invalid query parameters' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  async listMyContributions(
    @Query() query: unknown,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const parsed = contributionListQuerySchema.safeParse(query);

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

    const { cursor, limit, type } = parsed.data;

    // Find the contributor record for the authenticated user
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

    const where = {
      OR: [
        { contributorId: contributor.id },
        {
          collaborations: {
            some: {
              contributorId: contributor.id,
              isCurrent: true,
            },
          },
        },
      ],
      ...(type && { contributionType: type }),
      ...(cursor && {
        createdAt: {
          lt: (
            await this.prisma.contribution.findUnique({
              where: { id: cursor },
              select: { createdAt: true },
            })
          )?.createdAt,
        },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.contribution.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit + 1,
        include: {
          repository: {
            select: { fullName: true },
          },
          collaborations: {
            where: { isCurrent: true },
            include: {
              contributor: {
                select: { id: true, name: true, avatarUrl: true },
              },
            },
          },
        },
      }),
      this.prisma.contribution.count({
        where: {
          OR: [
            { contributorId: contributor.id },
            {
              collaborations: {
                some: {
                  contributorId: contributor.id,
                  isCurrent: true,
                },
              },
            },
          ],
          ...(type && { contributionType: type }),
        },
      }),
    ]);

    const hasMore = items.length > limit;
    const results = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? results[results.length - 1]?.id : undefined;

    const data = results.map((item) => ({
      id: item.id,
      contributorId: item.contributorId,
      taskId: item.taskId,
      repositoryId: item.repositoryId,
      repositoryName: item.repository.fullName,
      source: item.source,
      sourceRef: item.sourceRef,
      contributionType: item.contributionType,
      title: item.title,
      description: item.description,
      rawData: item.rawData,
      normalizedAt: item.normalizedAt.toISOString(),
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      collaborations: item.collaborations.map((c) => ({
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
      })),
    }));

    this.logger.debug('Listed contributions for contributor', {
      contributorId: contributor.id,
      count: data.length,
      total,
      correlationId: req.correlationId,
    });

    return createSuccessResponse(data, req.correlationId || 'unknown', {
      cursor: nextCursor ?? null,
      hasMore,
      total,
    });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'Contribution'))
  @ApiOperation({ summary: 'Get one authenticated contributor contribution' })
  @ApiParam({ name: 'id', type: String, description: 'Contribution identifier' })
  @ApiResponse({ status: 200, description: 'Contribution returned successfully' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 404, description: 'Contribution not found' })
  async getMyContribution(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    // Find the contributor record for the authenticated user
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

    const contribution = await this.prisma.contribution.findUnique({
      where: { id },
      include: {
        repository: {
          select: { fullName: true },
        },
        collaborations: {
          where: { isCurrent: true },
          include: {
            contributor: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
        },
      },
    });

    const hasAccess =
      contribution?.contributorId === contributor.id ||
      contribution?.collaborations.some(
        (collaboration) => collaboration.contributorId === contributor.id,
      );

    if (!contribution || !hasAccess) {
      throw new DomainException(
        ERROR_CODES.NOT_FOUND,
        'Contribution not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const data = {
      id: contribution.id,
      contributorId: contribution.contributorId,
      taskId: contribution.taskId,
      repositoryId: contribution.repositoryId,
      repositoryName: contribution.repository.fullName,
      source: contribution.source,
      sourceRef: contribution.sourceRef,
      contributionType: contribution.contributionType,
      title: contribution.title,
      description: contribution.description,
      rawData: contribution.rawData,
      normalizedAt: contribution.normalizedAt.toISOString(),
      status: contribution.status,
      createdAt: contribution.createdAt.toISOString(),
      updatedAt: contribution.updatedAt.toISOString(),
      collaborations: contribution.collaborations.map((c) => ({
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
      })),
    };

    return createSuccessResponse(data, req.correlationId || 'unknown');
  }
}

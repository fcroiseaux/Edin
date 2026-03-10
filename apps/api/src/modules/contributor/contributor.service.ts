import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ERROR_CODES } from '@edin/shared';
import type { UpdateContributorDto, RoleChangeEvent } from '@edin/shared';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { AuditService } from '../compliance/audit/audit.service.js';
import type { UpdateRoleDto } from './dto/update-role.dto.js';

@Injectable()
export class ContributorService {
  private readonly logger = new Logger(ContributorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditService: AuditService,
  ) {}

  private readonly publicProfileSelect = {
    id: true,
    name: true,
    avatarUrl: true,
    bio: true,
    domain: true,
    skillAreas: true,
    role: true,
    createdAt: true,
    showEvaluationScores: true,
  } as const;

  private decodeRosterCursor(cursor: string): { id: string; createdAt: Date } | null {
    try {
      const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
      const parsed = JSON.parse(decoded) as { id?: string; createdAt?: string };

      if (!parsed.id || !parsed.createdAt) {
        return null;
      }

      const createdAt = new Date(parsed.createdAt);
      if (Number.isNaN(createdAt.getTime())) {
        return null;
      }

      return { id: parsed.id, createdAt };
    } catch {
      return null;
    }
  }

  private encodeRosterCursor(item: { id: string; createdAt: Date }): string {
    return Buffer.from(
      JSON.stringify({ id: item.id, createdAt: item.createdAt.toISOString() }),
      'utf8',
    ).toString('base64url');
  }

  async getContributorRoster(params: {
    domain?: string;
    search?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = Math.min(params.limit ?? 20, 100);

    const where: Record<string, unknown> = { isActive: true };
    if (params.cursor) {
      const decodedCursor = this.decodeRosterCursor(params.cursor);
      if (!decodedCursor) {
        throw new DomainException(
          ERROR_CODES.VALIDATION_ERROR,
          'Invalid cursor format',
          HttpStatus.BAD_REQUEST,
        );
      }

      where.OR = [
        { createdAt: { gt: decodedCursor.createdAt } },
        {
          createdAt: decodedCursor.createdAt,
          id: { gt: decodedCursor.id },
        },
      ];
    }

    if (params.domain) {
      where.domain = params.domain;
    }
    if (params.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      this.prisma.contributor.findMany({
        where,
        select: this.publicProfileSelect,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: limit + 1,
      }),
      this.prisma.contributor.count({ where }),
    ]);

    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;

    const nextCursor =
      hasMore && resultItems.length > 0
        ? this.encodeRosterCursor(resultItems[resultItems.length - 1])
        : null;

    this.logger.log('Contributor roster queried', {
      count: resultItems.length,
      total,
      hasMore,
      domain: params.domain ?? 'all',
      hasSearch: Boolean(params.search),
      searchLength: params.search?.length ?? 0,
    });

    return { items: resultItems, cursor: nextCursor, hasMore, total };
  }

  async getFoundingContributors() {
    const contributors = await this.prisma.contributor.findMany({
      where: {
        role: 'FOUNDING_CONTRIBUTOR',
        isActive: true,
      },
      select: this.publicProfileSelect,
      orderBy: { createdAt: 'asc' },
    });

    this.logger.log('Founding contributors queried', {
      count: contributors.length,
    });

    return contributors;
  }

  async getPublicProfile(contributorId: string) {
    const contributor = await this.prisma.contributor.findUnique({
      where: { id: contributorId },
      select: this.publicProfileSelect,
    });

    if (!contributor) {
      throw new DomainException(
        ERROR_CODES.CONTRIBUTOR_NOT_FOUND,
        'Contributor not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return contributor;
  }

  async getProfile(contributorId: string) {
    const contributor = await this.prisma.contributor.findUnique({
      where: { id: contributorId },
    });

    if (!contributor) {
      throw new DomainException(
        ERROR_CODES.CONTRIBUTOR_NOT_FOUND,
        'Contributor not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return contributor;
  }

  async updateProfile(contributorId: string, dto: UpdateContributorDto, correlationId?: string) {
    const contributor = await this.prisma.contributor.findUnique({
      where: { id: contributorId },
    });

    if (!contributor) {
      throw new DomainException(
        ERROR_CODES.CONTRIBUTOR_NOT_FOUND,
        'Contributor not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const changedFields: string[] = [];
    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined && dto.name !== contributor.name) {
      updateData.name = dto.name;
      changedFields.push('name');
    }
    if (dto.bio !== undefined && dto.bio !== contributor.bio) {
      updateData.bio = dto.bio;
      changedFields.push('bio');
    }
    if (dto.domain !== undefined && dto.domain !== contributor.domain) {
      updateData.domain = dto.domain;
      changedFields.push('domain');
    }
    if (dto.avatarUrl !== undefined && dto.avatarUrl !== contributor.avatarUrl) {
      updateData.avatarUrl = dto.avatarUrl;
      changedFields.push('avatarUrl');
    }
    if (
      dto.skillAreas !== undefined &&
      JSON.stringify(dto.skillAreas) !== JSON.stringify(contributor.skillAreas)
    ) {
      updateData.skillAreas = dto.skillAreas;
      changedFields.push('skillAreas');
    }
    if (
      dto.showEvaluationScores !== undefined &&
      dto.showEvaluationScores !== contributor.showEvaluationScores
    ) {
      updateData.showEvaluationScores = dto.showEvaluationScores;
      changedFields.push('showEvaluationScores');
    }

    if (changedFields.length === 0) {
      this.logger.log('Contributor profile update skipped (no changes)', {
        contributorId,
        correlationId,
      });
      return contributor;
    }

    const updated = await this.prisma.contributor.update({
      where: { id: contributorId },
      data: updateData,
    });

    await this.auditService.log({
      actorId: contributorId,
      action: 'PROFILE_UPDATED',
      entityType: 'contributor',
      entityId: contributorId,
      details: { changedFields, actorId: contributorId },
      correlationId,
    });

    this.logger.log('Contributor profile updated', {
      contributorId,
      changedFields,
      correlationId,
    });

    return updated;
  }

  async updateRole(
    contributorId: string,
    dto: UpdateRoleDto,
    actorId: string,
    correlationId?: string,
  ) {
    const contributor = await this.prisma.contributor.findUnique({
      where: { id: contributorId },
    });

    if (!contributor) {
      throw new DomainException(
        ERROR_CODES.CONTRIBUTOR_NOT_FOUND,
        'Contributor not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (contributor.role === 'FOUNDING_CONTRIBUTOR') {
      this.logger.warn('Attempted role change on Founding Contributor', {
        contributorId,
        role: 'FOUNDING_CONTRIBUTOR',
        attemptedNewRole: dto.role,
        actorId,
        correlationId,
      });
      throw new DomainException(
        ERROR_CODES.FOUNDING_STATUS_PERMANENT,
        'Founding Contributor status is permanent and cannot be changed',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    if (contributor.role === dto.role) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        `Contributor already has role ${dto.role}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const oldRole = contributor.role;

    const updated = await this.prisma.contributor.update({
      where: { id: contributorId },
      data: { role: dto.role },
    });

    await this.auditService.log({
      actorId,
      action: 'ROLE_CHANGED',
      entityType: 'contributor',
      entityId: contributorId,
      previousState: { role: oldRole },
      newState: { role: dto.role },
      reason: dto.reason,
      details: { oldRole, newRole: dto.role, reason: dto.reason, actorId },
      correlationId,
    });

    this.logger.log('Contributor role updated', {
      contributorId,
      oldRole,
      newRole: dto.role,
      actorId,
      correlationId,
    });

    const event: RoleChangeEvent = {
      eventType: 'contributor.role.changed',
      timestamp: new Date().toISOString(),
      correlationId,
      actorId,
      payload: {
        contributorId,
        oldRole,
        newRole: dto.role,
        reason: dto.reason,
      },
    };
    this.eventEmitter.emit('contributor.role.changed', event);

    return updated;
  }

  async designateFoundingContributor(
    contributorId: string,
    reason: string,
    actorId: string,
    correlationId?: string,
  ) {
    const contributor = await this.prisma.contributor.findUnique({
      where: { id: contributorId },
    });

    if (!contributor) {
      throw new DomainException(
        ERROR_CODES.CONTRIBUTOR_NOT_FOUND,
        'Contributor not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (contributor.role === 'FOUNDING_CONTRIBUTOR') {
      throw new DomainException(
        ERROR_CODES.CONTRIBUTOR_ALREADY_EXISTS,
        'Contributor is already a Founding Contributor',
        HttpStatus.CONFLICT,
      );
    }

    const previousRole = contributor.role;

    const updated = await this.prisma.$transaction(async (tx) => {
      const designatedContributor = await tx.contributor.update({
        where: { id: contributorId },
        data: { role: 'FOUNDING_CONTRIBUTOR' },
      });

      await this.auditService.log(
        {
          actorId,
          action: 'FOUNDING_DESIGNATED',
          entityType: 'contributor',
          entityId: contributorId,
          previousState: { role: previousRole },
          newState: { role: 'FOUNDING_CONTRIBUTOR' },
          reason,
          details: { previousRole, reason, actorId },
          correlationId,
        },
        tx,
      );

      return designatedContributor;
    });

    this.logger.log('Contributor designated as Founding Contributor', {
      contributorId,
      previousRole,
      actorId,
      correlationId,
    });

    return updated;
  }
}

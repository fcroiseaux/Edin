import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '@edin/shared';
import type { UpdateContributorDto } from '@edin/shared';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import type { UpdateRoleDto } from './dto/update-role.dto.js';

@Injectable()
export class ContributorService {
  private readonly logger = new Logger(ContributorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPublicProfile(contributorId: string) {
    const contributor = await this.prisma.contributor.findUnique({
      where: { id: contributorId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        bio: true,
        domain: true,
        skillAreas: true,
        role: true,
        createdAt: true,
      },
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

    await this.prisma.auditLog.create({
      data: {
        actorId: contributorId,
        action: 'PROFILE_UPDATED',
        entityType: 'contributor',
        entityId: contributorId,
        details: { changedFields, actorId: contributorId },
        correlationId,
      },
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

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'ROLE_CHANGED',
        entityType: 'contributor',
        entityId: contributorId,
        details: { oldRole, newRole: dto.role, actorId },
        correlationId,
      },
    });

    this.logger.log('Contributor role updated', {
      contributorId,
      oldRole,
      newRole: dto.role,
      actorId,
      correlationId,
    });

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

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'FOUNDING_DESIGNATED',
          entityType: 'contributor',
          entityId: contributorId,
          details: { previousRole, reason, actorId },
          correlationId,
        },
      });

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

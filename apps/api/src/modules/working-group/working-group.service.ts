import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ERROR_CODES } from '@edin/shared';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

@Injectable()
export class WorkingGroupService {
  private readonly logger = new Logger(WorkingGroupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private async getRecentContributionCounts(contributorIds: string[], days = 30) {
    if (contributorIds.length === 0) {
      return new Map<string, number>();
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    const contributions = await this.prisma.contribution.findMany({
      where: {
        contributorId: { in: contributorIds },
        createdAt: { gte: since },
      },
      select: { contributorId: true },
    });

    const counts = new Map<string, number>();
    for (const contribution of contributions) {
      if (!contribution.contributorId) {
        continue;
      }

      counts.set(contribution.contributorId, (counts.get(contribution.contributorId) ?? 0) + 1);
    }

    return counts;
  }

  async assertLeadAccess(workingGroupId: string, userId: string, userRole: string) {
    if (userRole === 'ADMIN') {
      return;
    }

    const workingGroup = await this.prisma.workingGroup.findUnique({
      where: { id: workingGroupId },
      select: { id: true, leadContributorId: true },
    });

    if (!workingGroup) {
      throw new DomainException(
        ERROR_CODES.WORKING_GROUP_NOT_FOUND,
        'Working group not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (workingGroup.leadContributorId !== userId) {
      throw new DomainException(
        ERROR_CODES.NOT_WORKING_GROUP_LEAD,
        'You are not the assigned lead for this working group',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async findAll(currentContributorId?: string) {
    this.logger.log('Fetching all working groups', { module: 'working-group' });

    const groups = await this.prisma.workingGroup.findMany({
      orderBy: { name: 'asc' },
    });

    if (!currentContributorId) {
      return groups.map((g) => ({ ...g, isMember: false }));
    }

    const memberships = await this.prisma.workingGroupMember.findMany({
      where: { contributorId: currentContributorId },
      select: { workingGroupId: true },
    });

    const memberGroupIds = new Set(memberships.map((m) => m.workingGroupId));

    return groups.map((g) => ({
      ...g,
      isMember: memberGroupIds.has(g.id),
    }));
  }

  async findById(id: string, currentContributorId?: string) {
    this.logger.log('Fetching working group detail', {
      workingGroupId: id,
      module: 'working-group',
    });

    const workingGroup = await this.prisma.workingGroup.findUnique({
      where: { id },
      include: {
        leadContributor: {
          select: { id: true, name: true, avatarUrl: true },
        },
        members: {
          include: {
            contributor: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                domain: true,
                role: true,
              },
            },
          },
          orderBy: { joinedAt: 'desc' },
        },
        announcements: {
          include: {
            author: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
    });

    if (!workingGroup) {
      throw new DomainException(
        ERROR_CODES.WORKING_GROUP_NOT_FOUND,
        'Working group not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const contributionCounts = await this.getRecentContributionCounts(
      workingGroup.members.map((member) => member.contributorId),
    );

    const isMember = currentContributorId
      ? workingGroup.members.some((m) => m.contributorId === currentContributorId)
      : false;

    return {
      ...workingGroup,
      isMember,
      members: workingGroup.members.map((member) => ({
        ...member,
        recentContributionCount: contributionCounts.get(member.contributorId) ?? 0,
      })),
    };
  }

  async joinGroup(workingGroupId: string, contributorId: string, correlationId?: string) {
    this.logger.log('Contributor joining working group', {
      workingGroupId,
      contributorId,
      correlationId,
      module: 'working-group',
    });

    const workingGroup = await this.prisma.workingGroup.findUnique({
      where: { id: workingGroupId },
    });

    if (!workingGroup) {
      throw new DomainException(
        ERROR_CODES.WORKING_GROUP_NOT_FOUND,
        'Working group not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const existingMembership = await this.prisma.workingGroupMember.findUnique({
      where: {
        workingGroupId_contributorId: {
          workingGroupId,
          contributorId,
        },
      },
    });

    if (existingMembership) {
      throw new DomainException(
        ERROR_CODES.ALREADY_MEMBER,
        'You are already a member of this working group',
        HttpStatus.CONFLICT,
      );
    }

    let member;
    try {
      member = await this.prisma.$transaction(async (tx) => {
        const created = await tx.workingGroupMember.create({
          data: {
            workingGroupId,
            contributorId,
          },
        });

        await tx.workingGroup.update({
          where: { id: workingGroupId },
          data: { memberCount: { increment: 1 } },
        });

        await tx.auditLog.create({
          data: {
            actorId: contributorId,
            action: 'working-group.member.joined',
            entityType: 'WorkingGroupMember',
            entityId: created.id,
            details: { workingGroupId, workingGroupName: workingGroup.name },
            correlationId,
          },
        });

        return created;
      });
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2002') {
        throw new DomainException(
          ERROR_CODES.ALREADY_MEMBER,
          'You are already a member of this working group',
          HttpStatus.CONFLICT,
        );
      }
      throw err;
    }

    this.eventEmitter.emit('working-group.member.joined', {
      eventType: 'working-group.member.joined',
      timestamp: new Date().toISOString(),
      correlationId,
      actorId: contributorId,
      payload: {
        workingGroupId,
        contributorId,
        workingGroupName: workingGroup.name,
      },
    });

    this.logger.log('Contributor joined working group', {
      workingGroupId,
      contributorId,
      memberId: member.id,
      correlationId,
      module: 'working-group',
    });

    return member;
  }

  async leaveGroup(workingGroupId: string, contributorId: string, correlationId?: string) {
    this.logger.log('Contributor leaving working group', {
      workingGroupId,
      contributorId,
      correlationId,
      module: 'working-group',
    });

    const workingGroup = await this.prisma.workingGroup.findUnique({
      where: { id: workingGroupId },
    });

    if (!workingGroup) {
      throw new DomainException(
        ERROR_CODES.WORKING_GROUP_NOT_FOUND,
        'Working group not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const membership = await this.prisma.workingGroupMember.findUnique({
      where: {
        workingGroupId_contributorId: {
          workingGroupId,
          contributorId,
        },
      },
    });

    if (!membership) {
      throw new DomainException(
        ERROR_CODES.NOT_A_MEMBER,
        'You are not a member of this working group',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workingGroupMember.delete({
        where: { id: membership.id },
      });

      await tx.workingGroup.update({
        where: { id: workingGroupId },
        data: { memberCount: { decrement: 1 } },
      });

      await tx.auditLog.create({
        data: {
          actorId: contributorId,
          action: 'working-group.member.left',
          entityType: 'WorkingGroupMember',
          entityId: membership.id,
          details: { workingGroupId, workingGroupName: workingGroup.name },
          correlationId,
        },
      });
    });

    this.eventEmitter.emit('working-group.member.left', {
      eventType: 'working-group.member.left',
      timestamp: new Date().toISOString(),
      correlationId,
      actorId: contributorId,
      payload: {
        workingGroupId,
        contributorId,
        workingGroupName: workingGroup.name,
      },
    });

    this.logger.log('Contributor left working group', {
      workingGroupId,
      contributorId,
      correlationId,
      module: 'working-group',
    });
  }

  async getMembers(workingGroupId: string) {
    const workingGroup = await this.prisma.workingGroup.findUnique({
      where: { id: workingGroupId },
    });

    if (!workingGroup) {
      throw new DomainException(
        ERROR_CODES.WORKING_GROUP_NOT_FOUND,
        'Working group not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.prisma.workingGroupMember.findMany({
      where: { workingGroupId },
      include: {
        contributor: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            domain: true,
            role: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  async getGroupContributions(workingGroupId: string) {
    const members = await this.prisma.workingGroupMember.findMany({
      where: { workingGroupId },
      select: { contributorId: true },
    });

    const contributorIds = members.map((m) => m.contributorId);

    if (contributorIds.length === 0) {
      return [];
    }

    return this.prisma.contribution.findMany({
      where: { contributorId: { in: contributorIds } },
      include: {
        contributor: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        repository: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async getActiveTasksForDomain(domain: 'Technology' | 'Fintech' | 'Impact' | 'Governance') {
    return this.prisma.microTask.findMany({
      where: {
        domain,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        description: true,
        estimatedEffort: true,
        submissionFormat: true,
      },
    });
  }

  async createAnnouncement(
    workingGroupId: string,
    authorId: string,
    content: string,
    correlationId?: string,
  ) {
    this.logger.log('Creating announcement', {
      workingGroupId,
      authorId,
      correlationId,
      module: 'working-group',
    });

    if (content.length > 500) {
      throw new DomainException(
        ERROR_CODES.ANNOUNCEMENT_TOO_LONG,
        'Announcement must be 500 characters or less',
        HttpStatus.BAD_REQUEST,
      );
    }

    const workingGroup = await this.prisma.workingGroup.findUnique({
      where: { id: workingGroupId },
    });

    if (!workingGroup) {
      throw new DomainException(
        ERROR_CODES.WORKING_GROUP_NOT_FOUND,
        'Working group not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const announcement = await this.prisma.$transaction(async (tx) => {
      const created = await tx.announcement.create({
        data: {
          workingGroupId,
          authorId,
          content,
        },
        include: {
          author: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      });

      const members = await tx.workingGroupMember.findMany({
        where: { workingGroupId },
        select: { contributorId: true },
      });

      const recipients = members
        .map((member) => member.contributorId)
        .filter((contributorId) => contributorId !== authorId);

      if (recipients.length > 0) {
        await tx.auditLog.createMany({
          data: recipients.map((recipientId) => ({
            actorId: authorId,
            action: 'working-group.announcement.notification.pending',
            entityType: 'Announcement',
            entityId: created.id,
            details: {
              recipientId,
              workingGroupId,
              message: content,
            },
            correlationId,
          })),
        });
      }

      return created;
    });

    this.eventEmitter.emit('working-group.announcement.created', {
      eventType: 'working-group.announcement.created',
      timestamp: new Date().toISOString(),
      correlationId,
      actorId: authorId,
      payload: {
        announcementId: announcement.id,
        workingGroupId,
        authorId,
        content,
      },
    });

    this.logger.log('Announcement created', {
      announcementId: announcement.id,
      workingGroupId,
      correlationId,
      module: 'working-group',
    });

    return announcement;
  }

  async getAnnouncements(workingGroupId: string, limit = 5) {
    const workingGroup = await this.prisma.workingGroup.findUnique({
      where: { id: workingGroupId },
    });

    if (!workingGroup) {
      throw new DomainException(
        ERROR_CODES.WORKING_GROUP_NOT_FOUND,
        'Working group not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.prisma.announcement.findMany({
      where: { workingGroupId },
      include: {
        author: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 20),
    });
  }

  async deleteAnnouncement(
    workingGroupId: string,
    announcementId: string,
    userId: string,
    correlationId?: string,
  ) {
    this.logger.log('Deleting announcement', {
      workingGroupId,
      announcementId,
      userId,
      correlationId,
      module: 'working-group',
    });

    const announcement = await this.prisma.announcement.findUnique({
      where: { id: announcementId },
    });

    if (!announcement) {
      throw new DomainException(
        ERROR_CODES.ANNOUNCEMENT_NOT_FOUND,
        'Announcement not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (announcement.workingGroupId !== workingGroupId) {
      throw new DomainException(
        ERROR_CODES.ANNOUNCEMENT_NOT_FOUND,
        'Announcement not found in this working group',
        HttpStatus.NOT_FOUND,
      );
    }

    const user = await this.prisma.contributor.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (announcement.authorId !== userId && user?.role !== 'ADMIN') {
      throw new DomainException(
        ERROR_CODES.FORBIDDEN,
        'Only the author or an admin can delete this announcement',
        HttpStatus.FORBIDDEN,
      );
    }

    await this.prisma.announcement.delete({
      where: { id: announcementId },
    });

    this.eventEmitter.emit('working-group.announcement.deleted', {
      eventType: 'working-group.announcement.deleted',
      timestamp: new Date().toISOString(),
      correlationId,
      actorId: userId,
      payload: {
        announcementId,
        workingGroupId: announcement.workingGroupId,
      },
    });

    this.logger.log('Announcement deleted', {
      announcementId,
      correlationId,
      module: 'working-group',
    });
  }

  async getDomainHealthIndicators(workingGroupId: string) {
    this.logger.log('Computing domain health indicators', {
      workingGroupId,
      module: 'working-group',
    });

    const members = await this.prisma.workingGroupMember.findMany({
      where: { workingGroupId },
      select: { contributorId: true },
    });

    const contributorIds = members.map((m) => m.contributorId);

    if (contributorIds.length === 0) {
      return { activeMembers: 0, contributionVelocity: 0, totalContributions: 0 };
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const twentyEightDaysAgo = new Date();
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);

    const [recentContributions, totalContributions] = await Promise.all([
      this.prisma.contribution.findMany({
        where: {
          contributorId: { in: contributorIds },
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { contributorId: true, createdAt: true },
      }),
      this.prisma.contribution.count({
        where: { contributorId: { in: contributorIds } },
      }),
    ]);

    const activeMembers = new Set(recentContributions.map((c) => c.contributorId)).size;

    const velocityContributions = recentContributions.filter(
      (c) => c.createdAt >= twentyEightDaysAgo,
    ).length;
    const contributionVelocity = Math.round((velocityContributions / 4) * 10) / 10;

    return { activeMembers, contributionVelocity, totalContributions };
  }

  async getLeadDashboard(workingGroupId: string, correlationId?: string) {
    this.logger.log('Fetching lead dashboard', {
      workingGroupId,
      correlationId,
      module: 'working-group',
    });

    const workingGroup = await this.prisma.workingGroup.findUnique({
      where: { id: workingGroupId },
      include: {
        leadContributor: {
          select: { id: true, name: true, avatarUrl: true },
        },
        members: {
          include: {
            contributor: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                domain: true,
                role: true,
              },
            },
          },
          orderBy: { joinedAt: 'desc' },
        },
        announcements: {
          include: {
            author: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!workingGroup) {
      throw new DomainException(
        ERROR_CODES.WORKING_GROUP_NOT_FOUND,
        'Working group not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const contributionCounts = await this.getRecentContributionCounts(
      workingGroup.members.map((member) => member.contributorId),
    );

    const [tasks, contributions, healthIndicators] = await Promise.all([
      this.prisma.task.findMany({
        where: { domain: workingGroup.domain, status: { not: 'RETIRED' } },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        include: {
          claimedBy: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
        take: 50,
      }),
      this.getGroupContributions(workingGroupId),
      this.getDomainHealthIndicators(workingGroupId),
    ]);

    return {
      ...workingGroup,
      members: workingGroup.members.map((member) => ({
        ...member,
        recentContributionCount: contributionCounts.get(member.contributorId) ?? 0,
      })),
      tasks,
      recentContributions: contributions,
      healthIndicators,
    };
  }

  async assignLead(workingGroupId: string, contributorId: string, correlationId?: string) {
    this.logger.log('Assigning WG lead', {
      workingGroupId,
      contributorId,
      correlationId,
      module: 'working-group',
    });

    const workingGroup = await this.prisma.workingGroup.findUnique({
      where: { id: workingGroupId },
    });

    if (!workingGroup) {
      throw new DomainException(
        ERROR_CODES.WORKING_GROUP_NOT_FOUND,
        'Working group not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const contributor = await this.prisma.contributor.findUnique({
      where: { id: contributorId },
      select: { id: true, role: true },
    });

    if (!contributor) {
      throw new DomainException(
        ERROR_CODES.CONTRIBUTOR_NOT_FOUND,
        'Contributor not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (contributor.role !== 'WORKING_GROUP_LEAD') {
      throw new DomainException(
        ERROR_CODES.NOT_WORKING_GROUP_LEAD,
        'Contributor must have WORKING_GROUP_LEAD role',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const updated = await this.prisma.workingGroup.update({
      where: { id: workingGroupId },
      data: { leadContributorId: contributorId },
      include: {
        leadContributor: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    this.eventEmitter.emit('working-group.lead.assigned', {
      eventType: 'working-group.lead.assigned',
      timestamp: new Date().toISOString(),
      correlationId,
      actorId: contributorId,
      payload: {
        workingGroupId,
        contributorId,
        workingGroupName: workingGroup.name,
      },
    });

    this.logger.log('WG lead assigned', {
      workingGroupId,
      contributorId,
      correlationId,
      module: 'working-group',
    });

    return updated;
  }
}

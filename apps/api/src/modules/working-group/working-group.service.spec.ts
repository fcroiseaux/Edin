import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkingGroupService } from './working-group.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

const mockWorkingGroup = {
  id: 'wg-1',
  name: 'Technology',
  description: 'Tech group',
  domain: 'Technology',
  accentColor: '#0D9488',
  memberCount: 5,
  leadContributorId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAnnouncement = {
  id: 'ann-1',
  workingGroupId: 'wg-1',
  authorId: 'contributor-1',
  content: 'Welcome to the group!',
  createdAt: new Date(),
  author: { id: 'contributor-1', name: 'Test', avatarUrl: null },
};

const mockMember = {
  id: 'member-1',
  workingGroupId: 'wg-1',
  contributorId: 'contributor-1',
  joinedAt: new Date(),
};

describe('WorkingGroupService', () => {
  let service: WorkingGroupService;
  let prisma: {
    workingGroup: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    workingGroupMember: {
      findUnique: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    contribution: {
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
    };
    microTask: {
      findMany: ReturnType<typeof vi.fn>;
    };
    announcement: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    contributor: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    task: {
      findMany: ReturnType<typeof vi.fn>;
    };
    auditLog: {
      create: ReturnType<typeof vi.fn>;
      createMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let eventEmitter: { emit: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    prisma = {
      workingGroup: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      workingGroupMember: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      contribution: {
        findMany: vi.fn(),
        count: vi.fn(),
      },
      microTask: {
        findMany: vi.fn(),
      },
      announcement: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      contributor: {
        findUnique: vi.fn(),
      },
      task: {
        findMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
        createMany: vi.fn(),
      },
      $transaction: vi.fn(<T>(fn: (tx: typeof prisma) => T) => fn(prisma)),
    };
    eventEmitter = { emit: vi.fn() };

    const module = await Test.createTestingModule({
      providers: [
        WorkingGroupService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get(WorkingGroupService);
  });

  describe('findAll', () => {
    it('returns all working groups with isMember false when no contributor id', async () => {
      prisma.workingGroup.findMany.mockResolvedValue([mockWorkingGroup]);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].isMember).toBe(false);
      expect(prisma.workingGroup.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });

    it('returns isMember true for groups the contributor belongs to', async () => {
      prisma.workingGroup.findMany.mockResolvedValue([mockWorkingGroup]);
      prisma.workingGroupMember.findMany.mockResolvedValue([{ workingGroupId: 'wg-1' }]);

      const result = await service.findAll('contributor-1');

      expect(result[0].isMember).toBe(true);
    });

    it('returns isMember false when contributor has no memberships', async () => {
      prisma.workingGroup.findMany.mockResolvedValue([mockWorkingGroup]);
      prisma.workingGroupMember.findMany.mockResolvedValue([]);

      const result = await service.findAll('contributor-1');

      expect(result[0].isMember).toBe(false);
    });
  });

  describe('findById', () => {
    it('returns working group with members and isMember flag', async () => {
      prisma.contribution.findMany.mockResolvedValue([]);
      prisma.workingGroup.findUnique.mockResolvedValue({
        ...mockWorkingGroup,
        members: [
          {
            ...mockMember,
            contributor: {
              id: 'contributor-1',
              name: 'Test',
              avatarUrl: null,
              domain: 'Technology',
              role: 'CONTRIBUTOR',
            },
          },
        ],
      });

      const result = await service.findById('wg-1', 'contributor-1');

      expect(result.isMember).toBe(true);
      expect(result.name).toBe('Technology');
    });

    it('returns isMember false when contributor is not a member', async () => {
      prisma.contribution.findMany.mockResolvedValue([]);
      prisma.workingGroup.findUnique.mockResolvedValue({
        ...mockWorkingGroup,
        members: [
          {
            ...mockMember,
            contributor: {
              id: 'contributor-1',
              name: 'Test',
              avatarUrl: null,
              domain: 'Technology',
              role: 'CONTRIBUTOR',
            },
          },
        ],
      });

      const result = await service.findById('wg-1', 'other-contributor');

      expect(result.isMember).toBe(false);
    });

    it('throws WORKING_GROUP_NOT_FOUND when group does not exist', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(DomainException);
      await expect(service.findById('nonexistent')).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('joinGroup', () => {
    it('creates membership and increments member count', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(mockWorkingGroup);
      prisma.workingGroupMember.findUnique.mockResolvedValue(null);
      prisma.workingGroupMember.create.mockResolvedValue(mockMember);
      prisma.workingGroup.update.mockResolvedValue({ ...mockWorkingGroup, memberCount: 6 });
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.joinGroup('wg-1', 'contributor-1', 'corr-1');

      expect(result).toEqual(mockMember);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'working-group.member.joined',
        expect.objectContaining({
          eventType: 'working-group.member.joined',
          actorId: 'contributor-1',
          payload: expect.objectContaining({
            workingGroupId: 'wg-1',
            contributorId: 'contributor-1',
          }),
        }),
      );
    });

    it('throws ALREADY_MEMBER when contributor already joined', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(mockWorkingGroup);
      prisma.workingGroupMember.findUnique.mockResolvedValue(mockMember);

      await expect(service.joinGroup('wg-1', 'contributor-1')).rejects.toThrow(DomainException);
      await expect(service.joinGroup('wg-1', 'contributor-1')).rejects.toMatchObject({
        status: 409,
      });
    });

    it('throws WORKING_GROUP_NOT_FOUND when group does not exist', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(null);

      await expect(service.joinGroup('nonexistent', 'contributor-1')).rejects.toThrow(
        DomainException,
      );
      await expect(service.joinGroup('nonexistent', 'contributor-1')).rejects.toMatchObject({
        status: 404,
      });
    });
  });

  describe('leaveGroup', () => {
    it('removes membership and decrements member count', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(mockWorkingGroup);
      prisma.workingGroupMember.findUnique.mockResolvedValue(mockMember);
      prisma.workingGroupMember.delete.mockResolvedValue(mockMember);
      prisma.workingGroup.update.mockResolvedValue({ ...mockWorkingGroup, memberCount: 4 });
      prisma.auditLog.create.mockResolvedValue({});

      await service.leaveGroup('wg-1', 'contributor-1', 'corr-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'working-group.member.left',
        expect.objectContaining({
          eventType: 'working-group.member.left',
          actorId: 'contributor-1',
          payload: expect.objectContaining({
            workingGroupId: 'wg-1',
            contributorId: 'contributor-1',
          }),
        }),
      );
    });

    it('throws NOT_A_MEMBER when contributor is not a member', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(mockWorkingGroup);
      prisma.workingGroupMember.findUnique.mockResolvedValue(null);

      await expect(service.leaveGroup('wg-1', 'contributor-1')).rejects.toThrow(DomainException);
      await expect(service.leaveGroup('wg-1', 'contributor-1')).rejects.toMatchObject({
        status: 404,
      });
    });

    it('throws WORKING_GROUP_NOT_FOUND when group does not exist', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(null);

      await expect(service.leaveGroup('nonexistent', 'contributor-1')).rejects.toThrow(
        DomainException,
      );
    });
  });

  describe('getMembers', () => {
    it('returns members with contributor details', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(mockWorkingGroup);
      prisma.workingGroupMember.findMany.mockResolvedValue([
        {
          ...mockMember,
          contributor: {
            id: 'contributor-1',
            name: 'Test',
            avatarUrl: null,
            domain: 'Technology',
            role: 'CONTRIBUTOR',
          },
        },
      ]);

      const result = await service.getMembers('wg-1');

      expect(result).toHaveLength(1);
      expect(result[0].contributor.name).toBe('Test');
    });

    it('throws WORKING_GROUP_NOT_FOUND when group does not exist', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(null);

      await expect(service.getMembers('nonexistent')).rejects.toThrow(DomainException);
    });
  });

  describe('getGroupContributions', () => {
    it('returns recent contributions from group members', async () => {
      prisma.workingGroupMember.findMany.mockResolvedValue([{ contributorId: 'contributor-1' }]);
      prisma.contribution.findMany.mockResolvedValue([
        {
          id: 'contrib-1',
          title: 'Fix bug',
          contributionType: 'COMMIT',
          createdAt: new Date(),
          contributor: { id: 'contributor-1', name: 'Test', avatarUrl: null },
          repository: { fullName: 'edin/core' },
        },
      ]);

      const result = await service.getGroupContributions('wg-1');

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Fix bug');
    });

    it('returns empty array when no members exist', async () => {
      prisma.workingGroupMember.findMany.mockResolvedValue([]);

      const result = await service.getGroupContributions('wg-1');

      expect(result).toEqual([]);
    });
  });

  describe('getActiveTasksForDomain', () => {
    it('returns active domain tasks ordered by newest first', async () => {
      prisma.microTask.findMany.mockResolvedValue([
        {
          id: 'task-1',
          title: 'Build a REST API endpoint',
          description: 'Implement an endpoint',
          estimatedEffort: '2-4 hours',
          submissionFormat: 'GitHub repository link or gist',
        },
      ]);

      const result = await service.getActiveTasksForDomain('Technology');

      expect(result).toEqual([
        expect.objectContaining({
          id: 'task-1',
          title: 'Build a REST API endpoint',
        }),
      ]);
      expect(prisma.microTask.findMany).toHaveBeenCalledWith({
        where: { domain: 'Technology', isActive: true },
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
    });
  });

  describe('createAnnouncement', () => {
    it('creates announcement and emits event', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(mockWorkingGroup);
      prisma.announcement.create.mockResolvedValue(mockAnnouncement);
      prisma.workingGroupMember.findMany.mockResolvedValue([{ contributorId: 'member-2' }]);
      prisma.auditLog.createMany.mockResolvedValue({ count: 1 });

      const result = await service.createAnnouncement(
        'wg-1',
        'contributor-1',
        'Welcome to the group!',
        'corr-1',
      );

      expect(result).toEqual(mockAnnouncement);
      expect(prisma.announcement.create).toHaveBeenCalledWith({
        data: {
          workingGroupId: 'wg-1',
          authorId: 'contributor-1',
          content: 'Welcome to the group!',
        },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
        },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'working-group.announcement.created',
        expect.objectContaining({
          eventType: 'working-group.announcement.created',
          actorId: 'contributor-1',
          payload: expect.objectContaining({
            workingGroupId: 'wg-1',
            content: 'Welcome to the group!',
          }),
        }),
      );
      expect(prisma.auditLog.createMany).toHaveBeenCalled();
    });

    it('throws ANNOUNCEMENT_TOO_LONG when content exceeds 500 characters', async () => {
      const longContent = 'a'.repeat(501);

      await expect(
        service.createAnnouncement('wg-1', 'contributor-1', longContent),
      ).rejects.toThrow(DomainException);
      await expect(
        service.createAnnouncement('wg-1', 'contributor-1', longContent),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('throws WORKING_GROUP_NOT_FOUND when group does not exist', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(null);

      await expect(
        service.createAnnouncement('nonexistent', 'contributor-1', 'Test'),
      ).rejects.toThrow(DomainException);
      await expect(
        service.createAnnouncement('nonexistent', 'contributor-1', 'Test'),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('getAnnouncements', () => {
    it('returns announcements ordered by createdAt desc', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(mockWorkingGroup);
      prisma.announcement.findMany.mockResolvedValue([mockAnnouncement]);

      const result = await service.getAnnouncements('wg-1');

      expect(result).toHaveLength(1);
      expect(prisma.announcement.findMany).toHaveBeenCalledWith({
        where: { workingGroupId: 'wg-1' },
        include: {
          author: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
    });

    it('respects limit parameter', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(mockWorkingGroup);
      prisma.announcement.findMany.mockResolvedValue([]);

      await service.getAnnouncements('wg-1', 10);

      expect(prisma.announcement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });

    it('caps limit at 20', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(mockWorkingGroup);
      prisma.announcement.findMany.mockResolvedValue([]);

      await service.getAnnouncements('wg-1', 50);

      expect(prisma.announcement.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 }),
      );
    });

    it('throws WORKING_GROUP_NOT_FOUND when group does not exist', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(null);

      await expect(service.getAnnouncements('nonexistent')).rejects.toThrow(DomainException);
    });
  });

  describe('deleteAnnouncement', () => {
    it('deletes announcement by author and emits event', async () => {
      prisma.announcement.findUnique.mockResolvedValue(mockAnnouncement);
      prisma.contributor.findUnique.mockResolvedValue({ role: 'CONTRIBUTOR' });
      prisma.announcement.delete.mockResolvedValue(mockAnnouncement);

      await service.deleteAnnouncement('wg-1', 'ann-1', 'contributor-1', 'corr-1');

      expect(prisma.announcement.delete).toHaveBeenCalledWith({
        where: { id: 'ann-1' },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'working-group.announcement.deleted',
        expect.objectContaining({
          eventType: 'working-group.announcement.deleted',
          payload: expect.objectContaining({
            announcementId: 'ann-1',
            workingGroupId: 'wg-1',
          }),
        }),
      );
    });

    it('allows admin to delete any announcement', async () => {
      prisma.announcement.findUnique.mockResolvedValue(mockAnnouncement);
      prisma.contributor.findUnique.mockResolvedValue({ role: 'ADMIN' });
      prisma.announcement.delete.mockResolvedValue(mockAnnouncement);

      await service.deleteAnnouncement('wg-1', 'ann-1', 'admin-1', 'corr-1');

      expect(prisma.announcement.delete).toHaveBeenCalled();
    });

    it('throws FORBIDDEN when non-author non-admin tries to delete', async () => {
      prisma.announcement.findUnique.mockResolvedValue(mockAnnouncement);
      prisma.contributor.findUnique.mockResolvedValue({ role: 'CONTRIBUTOR' });

      await expect(
        service.deleteAnnouncement('wg-1', 'ann-1', 'other-user', 'corr-1'),
      ).rejects.toThrow(DomainException);
      await expect(
        service.deleteAnnouncement('wg-1', 'ann-1', 'other-user', 'corr-1'),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('throws ANNOUNCEMENT_NOT_FOUND when announcement does not exist', async () => {
      prisma.announcement.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteAnnouncement('wg-1', 'nonexistent', 'contributor-1'),
      ).rejects.toThrow(DomainException);
      await expect(
        service.deleteAnnouncement('wg-1', 'nonexistent', 'contributor-1'),
      ).rejects.toMatchObject({ status: 404 });
    });

    it('throws ANNOUNCEMENT_NOT_FOUND when announcement belongs to a different working group', async () => {
      prisma.announcement.findUnique.mockResolvedValue(mockAnnouncement);

      await expect(
        service.deleteAnnouncement('wg-other', 'ann-1', 'contributor-1', 'corr-1'),
      ).rejects.toThrow(DomainException);
      await expect(
        service.deleteAnnouncement('wg-other', 'ann-1', 'contributor-1', 'corr-1'),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('getDomainHealthIndicators', () => {
    it('computes correct values with contributions', async () => {
      prisma.workingGroupMember.findMany.mockResolvedValue([
        { contributorId: 'c-1' },
        { contributorId: 'c-2' },
        { contributorId: 'c-3' },
      ]);
      prisma.contribution.findMany.mockResolvedValue([
        { contributorId: 'c-1', createdAt: new Date() },
        { contributorId: 'c-1', createdAt: new Date() },
        { contributorId: 'c-2', createdAt: new Date() },
      ]);
      prisma.contribution.count.mockResolvedValue(10);

      const result = await service.getDomainHealthIndicators('wg-1');

      expect(result.activeMembers).toBe(2);
      expect(result.totalContributions).toBe(10);
      expect(result.contributionVelocity).toBeGreaterThanOrEqual(0);
    });

    it('returns zeros when no members', async () => {
      prisma.workingGroupMember.findMany.mockResolvedValue([]);

      const result = await service.getDomainHealthIndicators('wg-1');

      expect(result).toEqual({ activeMembers: 0, contributionVelocity: 0, totalContributions: 0 });
    });
  });

  describe('getLeadDashboard', () => {
    it('returns complete aggregated dashboard data', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue({
        ...mockWorkingGroup,
        leadContributor: { id: 'lead-1', name: 'Lead', avatarUrl: null },
        members: [],
        announcements: [],
      });
      prisma.task.findMany.mockResolvedValue([]);
      prisma.workingGroupMember.findMany.mockResolvedValue([]);
      prisma.contribution.findMany.mockResolvedValue([]);
      prisma.contribution.count.mockResolvedValue(0);

      const result = await service.getLeadDashboard('wg-1', 'corr-1');

      expect(result.id).toBe('wg-1');
      expect(result.leadContributor).toBeDefined();
      expect(result.tasks).toBeDefined();
      expect(result.healthIndicators).toBeDefined();
      expect(result.recentContributions).toBeDefined();
    });

    it('throws WORKING_GROUP_NOT_FOUND when group does not exist', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(null);

      await expect(service.getLeadDashboard('nonexistent')).rejects.toThrow(DomainException);
    });
  });

  describe('assignLead', () => {
    it('assigns lead with WORKING_GROUP_LEAD role', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(mockWorkingGroup);
      prisma.contributor.findUnique.mockResolvedValue({ id: 'lead-1', role: 'WORKING_GROUP_LEAD' });
      prisma.workingGroup.update.mockResolvedValue({
        ...mockWorkingGroup,
        leadContributorId: 'lead-1',
        leadContributor: { id: 'lead-1', name: 'Lead', avatarUrl: null },
      });

      const result = await service.assignLead('wg-1', 'lead-1', 'corr-1');

      expect(result.leadContributorId).toBe('lead-1');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'working-group.lead.assigned',
        expect.objectContaining({
          eventType: 'working-group.lead.assigned',
          payload: expect.objectContaining({
            workingGroupId: 'wg-1',
            contributorId: 'lead-1',
          }),
        }),
      );
    });

    it('throws NOT_WORKING_GROUP_LEAD when contributor lacks role', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(mockWorkingGroup);
      prisma.contributor.findUnique.mockResolvedValue({ id: 'user-1', role: 'CONTRIBUTOR' });

      await expect(service.assignLead('wg-1', 'user-1', 'corr-1')).rejects.toThrow(DomainException);
      await expect(service.assignLead('wg-1', 'user-1', 'corr-1')).rejects.toMatchObject({
        status: 422,
      });
    });

    it('throws NOT_WORKING_GROUP_LEAD when contributor is admin instead of WG lead', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(mockWorkingGroup);
      prisma.contributor.findUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN' });

      await expect(service.assignLead('wg-1', 'admin-1', 'corr-1')).rejects.toMatchObject({
        status: 422,
      });
    });

    it('throws CONTRIBUTOR_NOT_FOUND when contributor does not exist', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(mockWorkingGroup);
      prisma.contributor.findUnique.mockResolvedValue(null);

      await expect(service.assignLead('wg-1', 'nonexistent', 'corr-1')).rejects.toThrow(
        DomainException,
      );
      await expect(service.assignLead('wg-1', 'nonexistent', 'corr-1')).rejects.toMatchObject({
        status: 404,
      });
    });

    it('throws WORKING_GROUP_NOT_FOUND when group does not exist', async () => {
      prisma.workingGroup.findUnique.mockResolvedValue(null);

      await expect(service.assignLead('nonexistent', 'lead-1')).rejects.toThrow(DomainException);
    });
  });
});

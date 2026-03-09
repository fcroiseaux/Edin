import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ContributorService } from './contributor.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

const mockPrisma = {
  contributor: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn((callback: (tx: any) => unknown) => callback(mockPrisma)),
};

describe('ContributorService', () => {
  let service: ContributorService;

  const mockContributor = {
    id: 'contributor-uuid-1',
    githubId: 12345,
    name: 'Test Contributor',
    email: 'test@example.com',
    bio: 'A test contributor bio',
    avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
    domain: 'Technology',
    skillAreas: ['TypeScript', 'NestJS'],
    role: 'CONTRIBUTOR',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        ContributorService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get(ContributorService);
  });

  describe('updateRole', () => {
    it('updates contributor role and creates audit log', async () => {
      const updatedContributor = { ...mockContributor, role: 'EDITOR' };
      mockPrisma.contributor.findUnique.mockResolvedValueOnce(mockContributor);
      mockPrisma.contributor.update.mockResolvedValueOnce(updatedContributor);
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      const result = await service.updateRole(
        'contributor-uuid-1',
        { role: 'EDITOR' },
        'admin-uuid-1',
        'correlation-id-1',
      );

      expect(result.role).toBe('EDITOR');
      expect(mockPrisma.contributor.update).toHaveBeenCalledWith({
        where: { id: 'contributor-uuid-1' },
        data: { role: 'EDITOR' },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: 'admin-uuid-1',
          action: 'ROLE_CHANGED',
          entityType: 'contributor',
          entityId: 'contributor-uuid-1',
          details: {
            oldRole: 'CONTRIBUTOR',
            newRole: 'EDITOR',
            actorId: 'admin-uuid-1',
          },
          correlationId: 'correlation-id-1',
        },
      });
    });

    it('throws CONTRIBUTOR_NOT_FOUND when contributor does not exist', async () => {
      mockPrisma.contributor.findUnique.mockResolvedValueOnce(null);

      let caughtError: DomainException | undefined;
      try {
        await service.updateRole('nonexistent-uuid', { role: 'ADMIN' }, 'admin-uuid-1');
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('CONTRIBUTOR_NOT_FOUND');
      expect(caughtError!.getStatus()).toBe(404);
    });

    it('throws VALIDATION_ERROR when role is the same', async () => {
      mockPrisma.contributor.findUnique.mockResolvedValueOnce(mockContributor);

      let caughtError: DomainException | undefined;
      try {
        await service.updateRole('contributor-uuid-1', { role: 'CONTRIBUTOR' }, 'admin-uuid-1');
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('VALIDATION_ERROR');
      expect(caughtError!.getStatus()).toBe(400);
    });

    it('records correct old and new roles in audit log', async () => {
      const adminContributor = { ...mockContributor, role: 'ADMIN' };
      mockPrisma.contributor.findUnique.mockResolvedValueOnce(adminContributor);
      mockPrisma.contributor.update.mockResolvedValueOnce({
        ...adminContributor,
        role: 'CONTRIBUTOR',
      });
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      await service.updateRole(
        'contributor-uuid-1',
        { role: 'CONTRIBUTOR' },
        'admin-uuid-2',
        'corr-2',
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            details: {
              oldRole: 'ADMIN',
              newRole: 'CONTRIBUTOR',
              actorId: 'admin-uuid-2',
            },
          }),
        }),
      );
    });

    it('passes correlationId to audit log', async () => {
      mockPrisma.contributor.findUnique.mockResolvedValueOnce(mockContributor);
      mockPrisma.contributor.update.mockResolvedValueOnce({
        ...mockContributor,
        role: 'ADMIN',
      });
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      await service.updateRole(
        'contributor-uuid-1',
        { role: 'ADMIN' },
        'admin-uuid-1',
        'my-correlation-id',
      );

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            correlationId: 'my-correlation-id',
          }),
        }),
      );
    });

    it('throws FOUNDING_STATUS_PERMANENT when changing founding contributor role', async () => {
      const foundingContributor = { ...mockContributor, role: 'FOUNDING_CONTRIBUTOR' };
      mockPrisma.contributor.findUnique.mockResolvedValueOnce(foundingContributor);

      let caughtError: DomainException | undefined;
      try {
        await service.updateRole(
          'contributor-uuid-1',
          { role: 'CONTRIBUTOR' },
          'admin-uuid-1',
          'corr-perm-1',
        );
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('FOUNDING_STATUS_PERMANENT');
      expect(caughtError!.getStatus()).toBe(422);
      expect(mockPrisma.contributor.update).not.toHaveBeenCalled();
    });

    it('returns FOUNDING_STATUS_PERMANENT (422) before same-role check for founding contributors', async () => {
      const foundingContributor = { ...mockContributor, role: 'FOUNDING_CONTRIBUTOR' };
      mockPrisma.contributor.findUnique.mockResolvedValueOnce(foundingContributor);

      let caughtError: DomainException | undefined;
      try {
        await service.updateRole(
          'contributor-uuid-1',
          { role: 'FOUNDING_CONTRIBUTOR' },
          'admin-uuid-1',
        );
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('FOUNDING_STATUS_PERMANENT');
      expect(caughtError!.getStatus()).toBe(422);
    });
  });

  describe('designateFoundingContributor', () => {
    it('designates contributor as founding and creates audit log', async () => {
      const updatedContributor = { ...mockContributor, role: 'FOUNDING_CONTRIBUTOR' };
      mockPrisma.contributor.findUnique.mockResolvedValueOnce(mockContributor);
      mockPrisma.contributor.update.mockResolvedValueOnce(updatedContributor);
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      const result = await service.designateFoundingContributor(
        'contributor-uuid-1',
        'Outstanding early contribution to project foundation',
        'admin-uuid-1',
        'corr-founding-1',
      );

      expect(result.role).toBe('FOUNDING_CONTRIBUTOR');
      expect(mockPrisma.contributor.update).toHaveBeenCalledWith({
        where: { id: 'contributor-uuid-1' },
        data: { role: 'FOUNDING_CONTRIBUTOR' },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: 'admin-uuid-1',
          action: 'FOUNDING_DESIGNATED',
          entityType: 'contributor',
          entityId: 'contributor-uuid-1',
          details: {
            previousRole: 'CONTRIBUTOR',
            reason: 'Outstanding early contribution to project foundation',
            actorId: 'admin-uuid-1',
          },
          correlationId: 'corr-founding-1',
        },
      });
    });

    it('throws CONTRIBUTOR_ALREADY_EXISTS when contributor is already founding', async () => {
      const foundingContributor = { ...mockContributor, role: 'FOUNDING_CONTRIBUTOR' };
      mockPrisma.contributor.findUnique.mockResolvedValueOnce(foundingContributor);

      let caughtError: DomainException | undefined;
      try {
        await service.designateFoundingContributor(
          'contributor-uuid-1',
          'Trying to designate again',
          'admin-uuid-1',
        );
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('CONTRIBUTOR_ALREADY_EXISTS');
      expect(caughtError!.getStatus()).toBe(409);
      expect(mockPrisma.contributor.update).not.toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });

    it('throws CONTRIBUTOR_NOT_FOUND when contributor does not exist', async () => {
      mockPrisma.contributor.findUnique.mockResolvedValueOnce(null);

      let caughtError: DomainException | undefined;
      try {
        await service.designateFoundingContributor(
          'nonexistent-uuid',
          'Reason for designation',
          'admin-uuid-1',
        );
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('CONTRIBUTOR_NOT_FOUND');
      expect(caughtError!.getStatus()).toBe(404);
    });
  });

  describe('getFoundingContributors', () => {
    const publicSelect = {
      id: true,
      name: true,
      avatarUrl: true,
      bio: true,
      domain: true,
      skillAreas: true,
      role: true,
      createdAt: true,
      showEvaluationScores: true,
    };

    const foundingContributor1 = {
      id: 'founding-uuid-1',
      name: 'Founder One',
      avatarUrl: 'https://avatars.githubusercontent.com/u/111',
      bio: 'First founding contributor',
      domain: 'Technology',
      skillAreas: ['TypeScript'],
      role: 'FOUNDING_CONTRIBUTOR',
      createdAt: new Date('2025-01-01'),
    };

    const foundingContributor2 = {
      id: 'founding-uuid-2',
      name: 'Founder Two',
      avatarUrl: null,
      bio: 'Second founding contributor',
      domain: 'Fintech',
      skillAreas: ['Python', 'ML'],
      role: 'FOUNDING_CONTRIBUTOR',
      createdAt: new Date('2025-02-01'),
    };

    it('returns only FOUNDING_CONTRIBUTOR role contributors', async () => {
      mockPrisma.contributor.findMany.mockResolvedValueOnce([
        foundingContributor1,
        foundingContributor2,
      ]);

      const result = await service.getFoundingContributors();

      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('FOUNDING_CONTRIBUTOR');
      expect(result[1].role).toBe('FOUNDING_CONTRIBUTOR');
      expect(mockPrisma.contributor.findMany).toHaveBeenCalledWith({
        where: {
          role: 'FOUNDING_CONTRIBUTOR',
          isActive: true,
        },
        select: publicSelect,
        orderBy: { createdAt: 'asc' },
      });
    });

    it('returns empty array when no founding contributors exist', async () => {
      mockPrisma.contributor.findMany.mockResolvedValueOnce([]);

      const result = await service.getFoundingContributors();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('excludes inactive contributors', async () => {
      mockPrisma.contributor.findMany.mockResolvedValueOnce([foundingContributor1]);

      await service.getFoundingContributors();

      expect(mockPrisma.contributor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
          }),
        }),
      );
    });

    it('returns only public fields (no email, githubId, isActive, updatedAt)', async () => {
      mockPrisma.contributor.findMany.mockResolvedValueOnce([foundingContributor1]);

      const result = await service.getFoundingContributors();

      expect(result[0]).not.toHaveProperty('email');
      expect(result[0]).not.toHaveProperty('githubId');
      expect(result[0]).not.toHaveProperty('isActive');
      expect(result[0]).not.toHaveProperty('updatedAt');
      expect(mockPrisma.contributor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: publicSelect,
        }),
      );
    });

    it('orders contributors by createdAt ASC', async () => {
      mockPrisma.contributor.findMany.mockResolvedValueOnce([
        foundingContributor1,
        foundingContributor2,
      ]);

      await service.getFoundingContributors();

      expect(mockPrisma.contributor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'asc' },
        }),
      );
    });
  });

  describe('getPublicProfile', () => {
    it('returns only public fields (excludes email, githubId, isActive, updatedAt)', async () => {
      const publicFields = {
        id: 'contributor-uuid-1',
        name: 'Test Contributor',
        avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
        bio: 'A test contributor bio',
        domain: 'Technology',
        skillAreas: ['TypeScript', 'NestJS'],
        role: 'CONTRIBUTOR',
        createdAt: mockContributor.createdAt,
      };
      mockPrisma.contributor.findUnique.mockResolvedValueOnce(publicFields);

      const result = await service.getPublicProfile('contributor-uuid-1');

      expect(result).toEqual(publicFields);
      expect(result).not.toHaveProperty('email');
      expect(result).not.toHaveProperty('githubId');
      expect(result).not.toHaveProperty('isActive');
      expect(result).not.toHaveProperty('updatedAt');
      expect(mockPrisma.contributor.findUnique).toHaveBeenCalledWith({
        where: { id: 'contributor-uuid-1' },
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          bio: true,
          domain: true,
          skillAreas: true,
          role: true,
          createdAt: true,
          showEvaluationScores: true,
        },
      });
    });

    it('throws CONTRIBUTOR_NOT_FOUND when contributor does not exist', async () => {
      mockPrisma.contributor.findUnique.mockResolvedValueOnce(null);

      let caughtError: DomainException | undefined;
      try {
        await service.getPublicProfile('nonexistent-uuid');
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('CONTRIBUTOR_NOT_FOUND');
      expect(caughtError!.getStatus()).toBe(404);
    });

    it('includes role field for Founding Contributor badge display', async () => {
      const foundingPublicFields = {
        id: 'contributor-uuid-1',
        name: 'Test Contributor',
        avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
        bio: 'A test contributor bio',
        domain: 'Technology',
        skillAreas: ['TypeScript', 'NestJS'],
        role: 'FOUNDING_CONTRIBUTOR',
        createdAt: mockContributor.createdAt,
      };
      mockPrisma.contributor.findUnique.mockResolvedValueOnce(foundingPublicFields);

      const result = await service.getPublicProfile('contributor-uuid-1');

      expect(result.role).toBe('FOUNDING_CONTRIBUTOR');
    });
  });

  describe('getProfile', () => {
    it('returns contributor data when found', async () => {
      mockPrisma.contributor.findUnique.mockResolvedValueOnce(mockContributor);

      const result = await service.getProfile('contributor-uuid-1');

      expect(result).toEqual(mockContributor);
      expect(mockPrisma.contributor.findUnique).toHaveBeenCalledWith({
        where: { id: 'contributor-uuid-1' },
      });
    });

    it('throws CONTRIBUTOR_NOT_FOUND when contributor does not exist', async () => {
      mockPrisma.contributor.findUnique.mockResolvedValueOnce(null);

      let caughtError: DomainException | undefined;
      try {
        await service.getProfile('nonexistent-uuid');
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('CONTRIBUTOR_NOT_FOUND');
      expect(caughtError!.getStatus()).toBe(404);
    });
  });

  describe('updateProfile', () => {
    it('updates contributor bio and creates audit log with changedFields', async () => {
      const updatedContributor = { ...mockContributor, bio: 'Updated bio' };
      mockPrisma.contributor.findUnique.mockResolvedValueOnce(mockContributor);
      mockPrisma.contributor.update.mockResolvedValueOnce(updatedContributor);
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      const result = await service.updateProfile(
        'contributor-uuid-1',
        { bio: 'Updated bio' },
        'corr-profile-1',
      );

      expect(result.bio).toBe('Updated bio');
      expect(mockPrisma.contributor.update).toHaveBeenCalledWith({
        where: { id: 'contributor-uuid-1' },
        data: { bio: 'Updated bio' },
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: 'contributor-uuid-1',
          action: 'PROFILE_UPDATED',
          entityType: 'contributor',
          entityId: 'contributor-uuid-1',
          details: { changedFields: ['bio'], actorId: 'contributor-uuid-1' },
          correlationId: 'corr-profile-1',
        },
      });
    });

    it('updates multiple fields and audit log reflects all changed fields', async () => {
      const updatedContributor = {
        ...mockContributor,
        bio: 'New bio',
        domain: 'Fintech',
        skillAreas: ['React', 'GraphQL'],
      };
      mockPrisma.contributor.findUnique.mockResolvedValueOnce(mockContributor);
      mockPrisma.contributor.update.mockResolvedValueOnce(updatedContributor);
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      const result = await service.updateProfile(
        'contributor-uuid-1',
        { bio: 'New bio', domain: 'Fintech', skillAreas: ['React', 'GraphQL'] },
        'corr-multi-1',
      );

      expect(result.bio).toBe('New bio');
      expect(result.domain).toBe('Fintech');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          details: {
            changedFields: ['bio', 'domain', 'skillAreas'],
            actorId: 'contributor-uuid-1',
          },
        }),
      });
    });

    it('throws CONTRIBUTOR_NOT_FOUND when contributor does not exist', async () => {
      mockPrisma.contributor.findUnique.mockResolvedValueOnce(null);

      let caughtError: DomainException | undefined;
      try {
        await service.updateProfile('nonexistent-uuid', { bio: 'test' });
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('CONTRIBUTOR_NOT_FOUND');
      expect(caughtError!.getStatus()).toBe(404);
    });

    it('sends only changed fields to Prisma update', async () => {
      mockPrisma.contributor.findUnique.mockResolvedValueOnce(mockContributor);
      mockPrisma.contributor.update.mockResolvedValueOnce(mockContributor);
      mockPrisma.auditLog.create.mockResolvedValueOnce({});

      // Send same bio as current — should not appear in update data
      await service.updateProfile('contributor-uuid-1', {
        bio: 'A test contributor bio',
        name: 'New Name',
      });

      expect(mockPrisma.contributor.update).toHaveBeenCalledWith({
        where: { id: 'contributor-uuid-1' },
        data: { name: 'New Name' },
      });
    });

    it('skips database update and audit log when no fields changed', async () => {
      mockPrisma.contributor.findUnique.mockResolvedValueOnce(mockContributor);

      const result = await service.updateProfile('contributor-uuid-1', {
        name: mockContributor.name,
        bio: mockContributor.bio ?? undefined,
        domain:
          (mockContributor.domain as 'Technology' | 'Fintech' | 'Impact' | 'Governance' | null) ??
          undefined,
        avatarUrl: mockContributor.avatarUrl ?? undefined,
        skillAreas: [...mockContributor.skillAreas],
      });

      expect(result).toEqual(mockContributor);
      expect(mockPrisma.contributor.update).not.toHaveBeenCalled();
      expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
    });
  });

  describe('getContributorRoster', () => {
    const publicSelect = {
      id: true,
      name: true,
      avatarUrl: true,
      bio: true,
      domain: true,
      skillAreas: true,
      role: true,
      createdAt: true,
      showEvaluationScores: true,
    };

    const rosterContributor1 = {
      id: 'roster-uuid-1',
      name: 'Alice Tech',
      avatarUrl: 'https://avatars.githubusercontent.com/u/201',
      bio: 'Backend developer',
      domain: 'Technology',
      skillAreas: ['TypeScript', 'NestJS'],
      role: 'CONTRIBUTOR',
      createdAt: new Date('2025-06-01'),
    };

    const rosterContributor2 = {
      id: 'roster-uuid-2',
      name: 'Bob Finance',
      avatarUrl: null,
      bio: 'Fintech specialist',
      domain: 'Fintech',
      skillAreas: ['Python'],
      role: 'CONTRIBUTOR',
      createdAt: new Date('2025-06-15'),
    };

    const rosterContributor3 = {
      id: 'roster-uuid-3',
      name: 'Charlie Impact',
      avatarUrl: 'https://avatars.githubusercontent.com/u/203',
      bio: 'Sustainability researcher',
      domain: 'Impact',
      skillAreas: ['Research'],
      role: 'FOUNDING_CONTRIBUTOR',
      createdAt: new Date('2025-07-01'),
    };

    it('returns paginated results with default limit', async () => {
      mockPrisma.contributor.findMany.mockResolvedValueOnce([
        rosterContributor1,
        rosterContributor2,
        rosterContributor3,
      ]);
      mockPrisma.contributor.count.mockResolvedValueOnce(3);

      const result = await service.getContributorRoster({});

      expect(result.items).toHaveLength(3);
      expect(result.hasMore).toBe(false);
      expect(result.cursor).toBeNull();
      expect(result.total).toBe(3);
      expect(mockPrisma.contributor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          select: publicSelect,
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          take: 21,
        }),
      );
    });

    it('filters by domain correctly', async () => {
      mockPrisma.contributor.findMany.mockResolvedValueOnce([rosterContributor1]);
      mockPrisma.contributor.count.mockResolvedValueOnce(1);

      const result = await service.getContributorRoster({ domain: 'Technology' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].domain).toBe('Technology');
      expect(mockPrisma.contributor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true, domain: 'Technology' },
        }),
      );
    });

    it('searches by name case-insensitively', async () => {
      mockPrisma.contributor.findMany.mockResolvedValueOnce([rosterContributor1]);
      mockPrisma.contributor.count.mockResolvedValueOnce(1);

      const result = await service.getContributorRoster({ search: 'alice' });

      expect(result.items).toHaveLength(1);
      expect(mockPrisma.contributor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            isActive: true,
            name: { contains: 'alice', mode: 'insensitive' },
          },
        }),
      );
    });

    it('returns empty results for no matches', async () => {
      mockPrisma.contributor.findMany.mockResolvedValueOnce([]);
      mockPrisma.contributor.count.mockResolvedValueOnce(0);

      const result = await service.getContributorRoster({ search: 'nonexistent' });

      expect(result.items).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.cursor).toBeNull();
      expect(result.total).toBe(0);
    });

    it('respects limit parameter', async () => {
      mockPrisma.contributor.findMany.mockResolvedValueOnce([
        rosterContributor1,
        rosterContributor2,
      ]);
      mockPrisma.contributor.count.mockResolvedValueOnce(3);

      const result = await service.getContributorRoster({ limit: 1 });

      // findMany called with take: 2 (limit + 1)
      expect(mockPrisma.contributor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 2 }),
      );
      // hasMore is true because findMany returned 2 items (more than limit of 1)
      expect(result.hasMore).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.cursor).toEqual(expect.any(String));
    });

    it('cursor pagination works across pages', async () => {
      const cursor = Buffer.from(
        JSON.stringify({ id: 'roster-uuid-1', createdAt: '2025-06-01T00:00:00.000Z' }),
        'utf8',
      ).toString('base64url');

      mockPrisma.contributor.findMany.mockResolvedValueOnce([
        rosterContributor2,
        rosterContributor3,
      ]);
      mockPrisma.contributor.count.mockResolvedValueOnce(3);

      const result = await service.getContributorRoster({ cursor, limit: 2 });

      expect(mockPrisma.contributor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { createdAt: { gt: new Date('2025-06-01T00:00:00.000Z') } },
              {
                createdAt: new Date('2025-06-01T00:00:00.000Z'),
                id: { gt: 'roster-uuid-1' },
              },
            ],
          }),
          take: 3,
        }),
      );
      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it('throws VALIDATION_ERROR for malformed cursor', async () => {
      let caughtError: DomainException | undefined;
      try {
        await service.getContributorRoster({ cursor: 'invalid-cursor' });
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('VALIDATION_ERROR');
      expect(caughtError!.getStatus()).toBe(400);
      expect(mockPrisma.contributor.findMany).not.toHaveBeenCalled();
    });

    it('returns only public fields (no email, githubId)', async () => {
      mockPrisma.contributor.findMany.mockResolvedValueOnce([rosterContributor1]);
      mockPrisma.contributor.count.mockResolvedValueOnce(1);

      const result = await service.getContributorRoster({});

      expect(result.items[0]).not.toHaveProperty('email');
      expect(result.items[0]).not.toHaveProperty('githubId');
      expect(result.items[0]).not.toHaveProperty('isActive');
      expect(result.items[0]).not.toHaveProperty('updatedAt');
      expect(mockPrisma.contributor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: publicSelect,
        }),
      );
    });

    it('caps limit at 100 when higher value provided', async () => {
      mockPrisma.contributor.findMany.mockResolvedValueOnce([]);
      mockPrisma.contributor.count.mockResolvedValueOnce(0);

      await service.getContributorRoster({ limit: 200 });

      expect(mockPrisma.contributor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 101 }),
      );
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { ContributionController } from './contribution.controller.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

describe('ContributionController', () => {
  let controller: ContributionController;
  let prisma: {
    contributor: Record<string, ReturnType<typeof vi.fn>>;
    contribution: Record<string, ReturnType<typeof vi.fn>>;
  };

  const mockUser = {
    id: 'user-uuid-1',
    githubId: 12345,
    name: 'Test User',
    email: 'test@example.com',
    avatarUrl: null,
    role: 'CONTRIBUTOR',
  };

  const mockReq = {
    correlationId: 'corr-123',
    user: mockUser,
  };

  const mockContribution = {
    id: 'contrib-uuid-1',
    contributorId: 'contributor-uuid-1',
    repositoryId: 'repo-uuid-1',
    source: 'GITHUB',
    sourceRef: 'abc123',
    contributionType: 'COMMIT',
    title: 'feat: add feature',
    description: 'Some description',
    rawData: { extracted: {} },
    normalizedAt: new Date('2026-03-05T10:00:00Z'),
    status: 'ATTRIBUTED',
    createdAt: new Date('2026-03-05T10:00:00Z'),
    updatedAt: new Date('2026-03-05T10:00:00Z'),
    repository: { fullName: 'owner/repo' },
  };

  beforeEach(async () => {
    prisma = {
      contributor: {
        findUnique: vi.fn(),
      },
      contribution: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContributionController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        {
          provide: CaslAbilityFactory,
          useValue: { createForUser: vi.fn() },
        },
      ],
    }).compile();

    controller = module.get<ContributionController>(ContributionController);
  });

  describe('listMyContributions', () => {
    it('should return paginated contributions for authenticated contributor', async () => {
      prisma.contributor.findUnique.mockResolvedValue({ id: 'contributor-uuid-1' });
      prisma.contribution.findMany.mockResolvedValue([mockContribution]);
      prisma.contribution.count.mockResolvedValue(1);

      const result = await controller.listMyContributions(
        { limit: '20' },
        mockUser,
        mockReq as never,
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0].repositoryName).toBe('owner/repo');
      expect(result.meta.pagination).toEqual({
        cursor: null,
        hasMore: false,
        total: 1,
      });
    });

    it('should return 404 when contributor profile not found', async () => {
      prisma.contributor.findUnique.mockResolvedValue(null);

      await expect(
        controller.listMyContributions({ limit: '20' }, mockUser, mockReq as never),
      ).rejects.toThrow(DomainException);
    });

    it('should filter by contribution type when specified', async () => {
      prisma.contributor.findUnique.mockResolvedValue({ id: 'contributor-uuid-1' });
      prisma.contribution.findMany.mockResolvedValue([]);
      prisma.contribution.count.mockResolvedValue(0);

      await controller.listMyContributions(
        { limit: '20', type: 'COMMIT' },
        mockUser,
        mockReq as never,
      );

      expect(prisma.contribution.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contributionType: 'COMMIT',
          }),
        }),
      );
    });

    it('should indicate hasMore when results exceed limit', async () => {
      prisma.contributor.findUnique.mockResolvedValue({ id: 'contributor-uuid-1' });
      const items = Array.from({ length: 3 }, (_, i) => ({
        ...mockContribution,
        id: `contrib-uuid-${i}`,
      }));
      prisma.contribution.findMany.mockResolvedValue(items);
      prisma.contribution.count.mockResolvedValue(5);

      const result = await controller.listMyContributions(
        { limit: '2' },
        mockUser,
        mockReq as never,
      );

      expect(result.data).toHaveLength(2);
      expect(result.meta.pagination?.hasMore).toBe(true);
      expect(result.meta.pagination?.cursor).toBe('contrib-uuid-1');
    });
  });

  describe('getMyContribution', () => {
    it('should return contribution detail for authenticated contributor', async () => {
      prisma.contributor.findUnique.mockResolvedValue({ id: 'contributor-uuid-1' });
      prisma.contribution.findUnique.mockResolvedValue(mockContribution);

      const result = await controller.getMyContribution(
        'contrib-uuid-1',
        mockUser,
        mockReq as never,
      );

      expect(result.data.id).toBe('contrib-uuid-1');
      expect(result.data.repositoryName).toBe('owner/repo');
      expect(result.data.source).toBe('GITHUB');
    });

    it('should return 404 for contribution belonging to different contributor', async () => {
      prisma.contributor.findUnique.mockResolvedValue({ id: 'contributor-uuid-1' });
      prisma.contribution.findUnique.mockResolvedValue({
        ...mockContribution,
        contributorId: 'different-contributor',
      });

      await expect(
        controller.getMyContribution('contrib-uuid-1', mockUser, mockReq as never),
      ).rejects.toThrow(DomainException);
    });

    it('should return 404 when contribution does not exist', async () => {
      prisma.contributor.findUnique.mockResolvedValue({ id: 'contributor-uuid-1' });
      prisma.contribution.findUnique.mockResolvedValue(null);

      await expect(
        controller.getMyContribution('nonexistent', mockUser, mockReq as never),
      ).rejects.toThrow(DomainException);
    });
  });
});

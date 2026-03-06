import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContributionAttributionService } from './contribution-attribution.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { RedisService } from '../../../common/redis/redis.service.js';

describe('ContributionAttributionService', () => {
  let service: ContributionAttributionService;
  let prisma: {
    contribution: Record<string, ReturnType<typeof vi.fn>>;
    contributor: Record<string, ReturnType<typeof vi.fn>>;
  };
  let eventEmitter: { emit: ReturnType<typeof vi.fn> };
  let redisService: { publish: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    prisma = {
      contribution: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      contributor: {
        findUnique: vi.fn(),
      },
    };

    eventEmitter = {
      emit: vi.fn(),
    };

    redisService = {
      publish: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContributionAttributionService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<ContributionAttributionService>(ContributionAttributionService);
  });

  describe('attributeContribution', () => {
    const contributionId = 'contribution-uuid-1';
    const contributorId = 'contributor-uuid-1';
    const repositoryId = 'repo-uuid-1';
    const correlationId = 'corr-123';

    it('should attribute contribution when contributorId already set by webhook processor', async () => {
      prisma.contribution.findUnique.mockResolvedValue({
        id: contributionId,
        contributorId,
        contributionType: 'COMMIT',
        repositoryId,
        status: 'INGESTED',
        rawData: {},
      });
      prisma.contribution.update.mockResolvedValue({});

      await service.attributeContribution(contributionId, correlationId);

      expect(prisma.contribution.update).toHaveBeenCalledWith({
        where: { id: contributionId },
        data: { status: 'ATTRIBUTED' },
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('contribution.attributed', {
        contributionId,
        contributionType: 'COMMIT',
        contributorId,
        repositoryId,
        correlationId,
      });

      expect(redisService.publish).toHaveBeenCalledWith(
        `contributions:contributor:${contributorId}`,
        expect.any(String),
      );
    });

    it('should match contributor by GitHub ID from rawData', async () => {
      prisma.contribution.findUnique.mockResolvedValue({
        id: contributionId,
        contributorId: null,
        contributionType: 'COMMIT',
        repositoryId,
        status: 'INGESTED',
        rawData: { extracted: { authorGithubId: 12345, authorEmail: 'test@example.com' } },
      });
      prisma.contributor.findUnique.mockResolvedValueOnce({ id: contributorId }); // GitHub ID match
      prisma.contribution.update.mockResolvedValue({});

      await service.attributeContribution(contributionId, correlationId);

      expect(prisma.contributor.findUnique).toHaveBeenCalledWith({
        where: { githubId: 12345 },
        select: { id: true },
      });

      expect(prisma.contribution.update).toHaveBeenCalledWith({
        where: { id: contributionId },
        data: { contributorId, status: 'ATTRIBUTED' },
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'contribution.attributed',
        expect.objectContaining({
          contributionId,
          contributorId,
        }),
      );
    });

    it('should fallback to username matching when GitHub ID does not match', async () => {
      prisma.contribution.findUnique.mockResolvedValue({
        id: contributionId,
        contributorId: null,
        contributionType: 'COMMIT',
        repositoryId,
        status: 'INGESTED',
        rawData: {
          extracted: {
            authorGithubId: 99999,
            authorUsername: 'found-user',
            authorEmail: 'found@example.com',
          },
        },
      });
      prisma.contributor.findUnique
        .mockResolvedValueOnce(null) // GitHub ID miss
        .mockResolvedValueOnce({ id: contributorId }); // Username match
      prisma.contribution.update.mockResolvedValue({});

      await service.attributeContribution(contributionId, correlationId);

      expect(prisma.contributor.findUnique).toHaveBeenCalledTimes(2);
      expect(prisma.contributor.findUnique).toHaveBeenNthCalledWith(2, {
        where: { githubUsername: 'found-user' },
        select: { id: true },
      });

      expect(prisma.contribution.update).toHaveBeenCalledWith({
        where: { id: contributionId },
        data: { contributorId, status: 'ATTRIBUTED' },
      });
    });

    it('should fallback to email matching when username does not match', async () => {
      prisma.contribution.findUnique.mockResolvedValue({
        id: contributionId,
        contributorId: null,
        contributionType: 'COMMIT',
        repositoryId,
        status: 'INGESTED',
        rawData: {
          extracted: {
            authorGithubId: 99999,
            authorUsername: 'missing-user',
            authorEmail: 'found@example.com',
          },
        },
      });
      prisma.contributor.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: contributorId });
      prisma.contribution.update.mockResolvedValue({});

      await service.attributeContribution(contributionId, correlationId);

      expect(prisma.contributor.findUnique).toHaveBeenNthCalledWith(3, {
        where: { email: 'found@example.com' },
        select: { id: true },
      });
      expect(prisma.contribution.update).toHaveBeenCalledWith({
        where: { id: contributionId },
        data: { contributorId, status: 'ATTRIBUTED' },
      });
    });

    it('should mark as UNATTRIBUTED when no matching contributor found', async () => {
      prisma.contribution.findUnique.mockResolvedValue({
        id: contributionId,
        contributorId: null,
        contributionType: 'COMMIT',
        repositoryId,
        status: 'INGESTED',
        rawData: { extracted: { authorGithubId: 99999, authorEmail: 'unknown@example.com' } },
      });
      prisma.contributor.findUnique
        .mockResolvedValueOnce(null) // GitHub ID miss
        .mockResolvedValueOnce(null); // Email miss
      prisma.contribution.update.mockResolvedValue({});

      await service.attributeContribution(contributionId, correlationId);

      expect(prisma.contribution.update).toHaveBeenCalledWith({
        where: { id: contributionId },
        data: { status: 'UNATTRIBUTED' },
      });

      expect(eventEmitter.emit).not.toHaveBeenCalled();
      expect(redisService.publish).not.toHaveBeenCalled();
    });

    it('should handle contribution not found gracefully', async () => {
      prisma.contribution.findUnique.mockResolvedValue(null);

      await service.attributeContribution('nonexistent-id', correlationId);

      expect(prisma.contribution.update).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should mark UNATTRIBUTED when no GitHub ID and no email in rawData', async () => {
      prisma.contribution.findUnique.mockResolvedValue({
        id: contributionId,
        contributorId: null,
        contributionType: 'PULL_REQUEST',
        repositoryId,
        status: 'INGESTED',
        rawData: { extracted: {} },
      });
      prisma.contribution.update.mockResolvedValue({});

      await service.attributeContribution(contributionId, correlationId);

      expect(prisma.contribution.update).toHaveBeenCalledWith({
        where: { id: contributionId },
        data: { status: 'UNATTRIBUTED' },
      });
    });
  });

  describe('handleContributionIngested', () => {
    it('should process all INGESTED contributions for the repository', async () => {
      const event = {
        contributionId: 'c1',
        contributionType: 'COMMIT' as const,
        contributorId: null,
        repositoryId: 'repo-1',
        correlationId: 'corr-1',
      };

      prisma.contribution.findUnique.mockResolvedValue({
        id: 'c1',
        contributorId: 'contrib-1',
        contributionType: 'COMMIT',
        repositoryId: 'repo-1',
        status: 'INGESTED',
        rawData: {},
      });
      prisma.contribution.update.mockResolvedValue({});

      await service.handleContributionIngested(event);

      expect(prisma.contribution.findUnique).toHaveBeenCalledWith({
        where: { id: 'c1' },
        select: {
          id: true,
          contributorId: true,
          contributionType: true,
          repositoryId: true,
          status: true,
          rawData: true,
        },
      });
    });
  });
});

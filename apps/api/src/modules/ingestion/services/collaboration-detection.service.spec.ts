import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CollaborationDetectionService } from './collaboration-detection.service.js';
import { AuditService } from '../../compliance/audit/audit.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { RedisService } from '../../../common/redis/redis.service.js';
import { GitHubApiService } from '../github-api.service.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('CollaborationDetectionService', () => {
  let service: CollaborationDetectionService;
  let mockAuditService: { log: ReturnType<typeof vi.fn> };
  let prisma: {
    contribution: { findUnique: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
    contributor: { findUnique: ReturnType<typeof vi.fn> };
    contributionCollaboration: { upsert: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let eventEmitter: { emit: ReturnType<typeof vi.fn> };
  let redisService: { publish: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };
  let githubApiService: { getIssue: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    mockAuditService = { log: vi.fn().mockResolvedValue(undefined) };
    prisma = {
      contribution: { findUnique: vi.fn(), count: vi.fn() },
      contributor: { findUnique: vi.fn() },
      contributionCollaboration: { upsert: vi.fn() },
      $transaction: vi.fn(<T>(fn: (tx: typeof prisma) => T) => fn(prisma)),
    };
    eventEmitter = { emit: vi.fn() };
    redisService = { publish: vi.fn(), set: vi.fn() };
    githubApiService = { getIssue: vi.fn() };

    prisma.contribution.count.mockResolvedValue(0);
    redisService.set.mockResolvedValue(undefined);

    const module = await Test.createTestingModule({
      providers: [
        CollaborationDetectionService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: RedisService, useValue: redisService },
        { provide: GitHubApiService, useValue: githubApiService },
      ],
    }).compile();

    service = module.get(CollaborationDetectionService);
  });

  it('detects co-authors from Co-authored-by trailers in commit messages', async () => {
    prisma.contribution.findUnique.mockResolvedValue({
      id: 'contrib-1',
      contributorId: 'user-1',
      contributionType: 'COMMIT',
      rawData: {
        message: 'feat: add feature\n\nCo-authored-by: Lena <lena@example.com>',
        extracted: {
          message: 'feat: add feature\n\nCo-authored-by: Lena <lena@example.com>',
        },
      },
    });

    // Resolve co-author by email
    prisma.contributor.findUnique.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      ({ where }: { where: Record<string, unknown> }) => {
        if (where.email === 'lena@example.com') {
          return Promise.resolve({ id: 'user-2' });
        }
        return Promise.resolve(null);
      },
    );

    prisma.contributionCollaboration.upsert.mockResolvedValue({});

    redisService.publish.mockResolvedValue(undefined);

    await service.detectCollaborators('contrib-1', 'corr-1');

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'contribution.collaboration.detected',
      expect.objectContaining({
        contributionId: 'contrib-1',
      }),
    );
    expect(redisService.set).toHaveBeenCalled();
  });

  it('detects multiple committers from PR commitAuthors', async () => {
    prisma.contribution.findUnique.mockResolvedValue({
      id: 'contrib-1',
      contributorId: 'user-1',
      contributionType: 'PULL_REQUEST',
      rawData: {
        extracted: {
          body: '',
          linkedIssues: [],
          commitAuthors: [{ githubId: 200, username: 'another-dev' }],
        },
      },
    });

    prisma.contributor.findUnique.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      ({ where }: { where: Record<string, unknown> }) => {
        if (where.githubId === 200) {
          return Promise.resolve({ id: 'user-3' });
        }
        return Promise.resolve(null);
      },
    );

    prisma.contributionCollaboration.upsert.mockResolvedValue({});

    redisService.publish.mockResolvedValue(undefined);

    await service.detectCollaborators('contrib-1', 'corr-1');

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'contribution.collaboration.detected',
      expect.objectContaining({
        contributionId: 'contrib-1',
        collaborators: expect.arrayContaining([
          expect.objectContaining({ contributorId: 'user-3', role: 'COMMITTER' }),
        ]),
      }),
    );
  });

  it('detects issue assignees from linked issues via GitHub API', async () => {
    prisma.contribution.findUnique
      .mockResolvedValueOnce({
        id: 'contrib-1',
        contributorId: 'user-1',
        contributionType: 'PULL_REQUEST',
        rawData: {
          extracted: {
            body: '',
            linkedIssues: ['42'],
          },
        },
      })
      .mockResolvedValueOnce({
        repository: { fullName: 'org/repo' },
      });

    githubApiService.getIssue.mockResolvedValue({
      assignees: [{ githubId: 300, username: 'assignee-user' }],
    });

    prisma.contributor.findUnique.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      ({ where }: { where: Record<string, unknown> }) => {
        if (where.githubId === 300) {
          return Promise.resolve({ id: 'user-4' });
        }
        return Promise.resolve(null);
      },
    );

    prisma.contributionCollaboration.upsert.mockResolvedValue({});

    redisService.publish.mockResolvedValue(undefined);

    await service.detectCollaborators('contrib-1', 'corr-1');

    expect(githubApiService.getIssue).toHaveBeenCalledWith('org', 'repo', 42);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('detects PR co-authors from extracted commit messages', async () => {
    prisma.contribution.findUnique.mockResolvedValue({
      id: 'contrib-1',
      contributorId: 'user-1',
      contributionType: 'PULL_REQUEST',
      rawData: {
        extracted: {
          body: '',
          linkedIssues: [],
          commits: [{ message: 'feat: pair\n\nCo-authored-by: Lena <lena@example.com>' }],
          commitAuthors: [],
        },
      },
    });

    prisma.contributor.findUnique.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      ({ where }: { where: Record<string, unknown> }) => {
        if (where.email === 'lena@example.com') {
          return Promise.resolve({ id: 'user-2' });
        }
        return Promise.resolve(null);
      },
    );

    prisma.contributionCollaboration.upsert.mockResolvedValue({});

    redisService.publish.mockResolvedValue(undefined);

    await service.detectCollaborators('contrib-1', 'corr-1');

    expect(prisma.contributionCollaboration.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ contributorId: 'user-2', role: 'CO_AUTHOR' }),
      }),
    );
  });

  it('skips detection for code reviews', async () => {
    prisma.contribution.findUnique.mockResolvedValue({
      id: 'contrib-1',
      contributorId: 'user-1',
      contributionType: 'CODE_REVIEW',
      rawData: {},
    });

    await service.detectCollaborators('contrib-1', 'corr-1');

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('creates no records when no collaborators detected', async () => {
    prisma.contribution.findUnique.mockResolvedValue({
      id: 'contrib-1',
      contributorId: 'user-1',
      contributionType: 'COMMIT',
      rawData: {
        message: 'simple commit',
        extracted: { message: 'simple commit' },
      },
    });

    await service.detectCollaborators('contrib-1', 'corr-1');

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('skips unregistered collaborators', async () => {
    prisma.contribution.findUnique.mockResolvedValue({
      id: 'contrib-1',
      contributorId: 'user-1',
      contributionType: 'COMMIT',
      rawData: {
        message: 'feat: add\n\nCo-authored-by: Unknown <unknown@example.com>',
        extracted: {
          message: 'feat: add\n\nCo-authored-by: Unknown <unknown@example.com>',
        },
      },
    });

    // No contributor found for email
    prisma.contributor.findUnique.mockResolvedValue(null);

    await service.detectCollaborators('contrib-1', 'corr-1');

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('calculates equal split for 2 collaborators (50% each)', async () => {
    prisma.contribution.findUnique.mockResolvedValue({
      id: 'contrib-1',
      contributorId: 'user-1',
      contributionType: 'COMMIT',
      rawData: {
        message: 'feat: add\n\nCo-authored-by: Lena <lena@example.com>',
        extracted: {
          message: 'feat: add\n\nCo-authored-by: Lena <lena@example.com>',
        },
      },
    });

    prisma.contributor.findUnique.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      ({ where }: { where: Record<string, unknown> }) => {
        if (where.email === 'lena@example.com') {
          return Promise.resolve({ id: 'user-2' });
        }
        return Promise.resolve(null);
      },
    );

    prisma.contributionCollaboration.upsert.mockResolvedValue({});

    redisService.publish.mockResolvedValue(undefined);

    await service.detectCollaborators('contrib-1', 'corr-1');

    // Check that the upsert calls have the correct splitPercentage
    const upsertCalls = prisma.contributionCollaboration.upsert.mock.calls;
    expect(upsertCalls).toHaveLength(2); // primary + 1 co-author
    expect(upsertCalls[0][0].create.splitPercentage).toBe(50);
    expect(upsertCalls[1][0].create.splitPercentage).toBe(50);
  });

  it('calculates equal split for 3 participants (33.33% each)', async () => {
    prisma.contribution.findUnique.mockResolvedValue({
      id: 'contrib-1',
      contributorId: 'user-1',
      contributionType: 'COMMIT',
      rawData: {
        message:
          'feat: add\n\nCo-authored-by: Lena <lena@example.com>\nCo-authored-by: Marco <marco@example.com>',
        extracted: {
          message:
            'feat: add\n\nCo-authored-by: Lena <lena@example.com>\nCo-authored-by: Marco <marco@example.com>',
        },
      },
    });

    prisma.contributor.findUnique.mockImplementation(
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      ({ where }: { where: Record<string, unknown> }) => {
        if (where.email === 'lena@example.com') return Promise.resolve({ id: 'user-2' });
        if (where.email === 'marco@example.com') return Promise.resolve({ id: 'user-3' });
        return Promise.resolve(null);
      },
    );

    prisma.contributionCollaboration.upsert.mockResolvedValue({});

    redisService.publish.mockResolvedValue(undefined);

    await service.detectCollaborators('contrib-1', 'corr-1');

    const upsertCalls = prisma.contributionCollaboration.upsert.mock.calls;
    expect(upsertCalls).toHaveLength(3); // primary + 2 co-authors
    expect(upsertCalls[0][0].create.splitPercentage).toBeCloseTo(33.33, 1);
  });
});

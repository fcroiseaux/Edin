import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getQueueToken } from '@nestjs/bullmq';
import { WebhookProcessor } from './webhook.processor.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { Job } from 'bullmq';
import type { WebhookJobData } from './webhook.processor.js';

const mockPrisma = {
  monitoredRepository: {
    findUnique: vi.fn(),
  },
  webhookDelivery: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  contributor: {
    findUnique: vi.fn(),
  },
  contribution: {
    upsert: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn((callback: (tx: unknown) => unknown) => callback(mockPrisma)),
};

const mockEventEmitter = { emit: vi.fn() };
const mockDlqQueue = { add: vi.fn() };

const mockRepository = {
  id: 'repo-uuid-1',
  owner: 'edin-org',
  repo: 'edin-core',
  fullName: 'edin-org/edin-core',
  webhookId: 123,
  webhookSecret: 'secret',
  status: 'ACTIVE',
  statusMessage: null,
  addedById: 'admin-uuid',
  createdAt: new Date('2026-03-01'),
  updatedAt: new Date('2026-03-01'),
};

const mockContributor = {
  id: 'contributor-uuid-1',
};

function createMockJob(
  data: WebhookJobData,
  opts?: Partial<Job<WebhookJobData>>,
): Job<WebhookJobData> {
  return {
    id: 'job-1',
    data,
    attemptsMade: 0,
    opts: { attempts: 3 },
    moveToDelayed: vi.fn(),
    ...opts,
  } as unknown as Job<WebhookJobData>;
}

describe('WebhookProcessor', () => {
  let processor: WebhookProcessor;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Restore $transaction default implementation (may be overridden by mockRejectedValue in tests)
    mockPrisma.$transaction.mockImplementation((callback: (tx: unknown) => unknown) =>
      callback(mockPrisma),
    );

    const module = await Test.createTestingModule({
      providers: [
        WebhookProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: getQueueToken('github-ingestion-dlq'), useValue: mockDlqQueue },
      ],
    }).compile();

    processor = module.get(WebhookProcessor);
  });

  // ─── Push event extraction (Task 8.1) ──────────────────────────────────

  describe('push event processing', () => {
    const pushPayload = {
      ref: 'refs/heads/main',
      sender: { id: 12345, login: 'testuser' },
      commits: [
        {
          id: 'abc123def456',
          author: { email: 'test@example.com', name: 'Test User' },
          message: 'feat: add login page\n\nImplements user authentication UI',
          timestamp: '2026-03-05T10:00:00Z',
          added: ['src/login.ts'],
          removed: [],
          modified: ['src/app.ts'],
        },
        {
          id: 'def789ghi012',
          author: { email: 'test@example.com', name: 'Test User' },
          message: 'fix: correct button alignment',
          timestamp: '2026-03-05T10:05:00Z',
          added: [],
          removed: [],
          modified: ['src/login.css'],
        },
      ],
      repository: { full_name: 'edin-org/edin-core' },
    };

    it('should extract commits from push event and create contributions', async () => {
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(mockRepository);
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(null);
      mockPrisma.webhookDelivery.upsert.mockResolvedValue({});
      mockPrisma.webhookDelivery.update.mockResolvedValue({});
      mockPrisma.contributor.findUnique.mockResolvedValue(mockContributor);
      mockPrisma.contribution.upsert
        .mockResolvedValueOnce({ id: 'contribution-1' })
        .mockResolvedValueOnce({ id: 'contribution-2' });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const job = createMockJob({
        eventType: 'push',
        repositoryFullName: 'edin-org/edin-core',
        payload: pushPayload,
        deliveryId: 'delivery-push-1',
      });

      await processor.process(job);

      // Should have called upsert for each commit in the transaction
      expect(mockPrisma.contribution.upsert).toHaveBeenCalledTimes(2);

      // Verify first commit extraction
      const firstCall = mockPrisma.contribution.upsert.mock.calls[0][0];
      expect(firstCall.create.sourceRef).toBe('abc123def456');
      expect(firstCall.create.contributionType).toBe('COMMIT');
      expect(firstCall.create.title).toBe('feat: add login page');
      expect(firstCall.create.description).toContain('Implements user authentication UI');
      expect(firstCall.create.contributorId).toBe('contributor-uuid-1');
      expect(firstCall.create.repositoryId).toBe('repo-uuid-1');
      expect(firstCall.create.source).toBe('GITHUB');

      // Verify domain events emitted
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'contribution.commit.ingested',
        expect.objectContaining({
          contributionId: 'contribution-1',
          contributionType: 'COMMIT',
          contributorId: 'contributor-uuid-1',
          repositoryId: 'repo-uuid-1',
          correlationId: 'delivery-push-1',
        }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledTimes(2);

      // Verify delivery marked COMPLETED
      expect(mockPrisma.webhookDelivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deliveryId: 'delivery-push-1' },
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
    });

    it('should handle push event with no commits array', async () => {
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(mockRepository);
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(null);
      mockPrisma.webhookDelivery.upsert.mockResolvedValue({});
      mockPrisma.webhookDelivery.update.mockResolvedValue({});

      const job = createMockJob({
        eventType: 'push',
        repositoryFullName: 'edin-org/edin-core',
        payload: { repository: { full_name: 'edin-org/edin-core' } },
        deliveryId: 'delivery-push-empty',
      });

      await processor.process(job);

      expect(mockPrisma.contribution.upsert).not.toHaveBeenCalled();
      expect(mockPrisma.webhookDelivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
    });
  });

  // ─── Pull request event extraction (Task 8.1) ─────────────────────────

  describe('pull_request event processing', () => {
    const prPayload = {
      action: 'opened',
      pull_request: {
        number: 42,
        title: 'Add authentication module',
        body: 'Implements login flow. Fixes #10 and #15.',
        user: { id: 12345, login: 'testuser' },
        state: 'open',
        requested_reviewers: [{ login: 'reviewer1' }],
        merged: false,
        merge_commit_sha: null,
        head: { ref: 'feature/auth' },
        base: { ref: 'main' },
      },
      repository: { full_name: 'edin-org/edin-core' },
      sender: { id: 12345 },
    };

    it('should extract PR details and create contribution', async () => {
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(mockRepository);
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(null);
      mockPrisma.webhookDelivery.upsert.mockResolvedValue({});
      mockPrisma.webhookDelivery.update.mockResolvedValue({});
      mockPrisma.contributor.findUnique.mockResolvedValue(mockContributor);
      mockPrisma.contribution.upsert.mockResolvedValue({ id: 'contribution-pr-1' });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const job = createMockJob({
        eventType: 'pull_request',
        repositoryFullName: 'edin-org/edin-core',
        payload: prPayload,
        deliveryId: 'delivery-pr-1',
      });

      await processor.process(job);

      expect(mockPrisma.contribution.upsert).toHaveBeenCalledTimes(1);

      const upsertCall = mockPrisma.contribution.upsert.mock.calls[0][0];
      expect(upsertCall.create.sourceRef).toBe('42');
      expect(upsertCall.create.contributionType).toBe('PULL_REQUEST');
      expect(upsertCall.create.title).toBe('Add authentication module');
      expect(upsertCall.create.description).toContain('Fixes #10 and #15');
      expect(upsertCall.create.contributorId).toBe('contributor-uuid-1');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'contribution.pull_request.ingested',
        expect.objectContaining({
          contributionId: 'contribution-pr-1',
          contributionType: 'PULL_REQUEST',
          correlationId: 'delivery-pr-1',
        }),
      );
    });

    it('should handle PR event with missing pull_request object', async () => {
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(mockRepository);
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(null);
      mockPrisma.webhookDelivery.upsert.mockResolvedValue({});
      mockPrisma.webhookDelivery.update.mockResolvedValue({});

      const job = createMockJob({
        eventType: 'pull_request',
        repositoryFullName: 'edin-org/edin-core',
        payload: { repository: { full_name: 'edin-org/edin-core' } },
        deliveryId: 'delivery-pr-empty',
      });

      await processor.process(job);
      expect(mockPrisma.contribution.upsert).not.toHaveBeenCalled();
    });
  });

  // ─── Pull request review event extraction (Task 8.1) ──────────────────

  describe('pull_request_review event processing', () => {
    const reviewPayload = {
      action: 'submitted',
      review: {
        id: 7890,
        user: { id: 67890, login: 'reviewer1' },
        body: 'Looks good, minor nits.',
        state: 'approved',
        submitted_at: '2026-03-05T12:00:00Z',
      },
      pull_request: {
        number: 42,
        title: 'Add auth',
      },
      repository: { full_name: 'edin-org/edin-core' },
      sender: { id: 67890 },
    };

    it('should extract review details and create contribution', async () => {
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(mockRepository);
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(null);
      mockPrisma.webhookDelivery.upsert.mockResolvedValue({});
      mockPrisma.webhookDelivery.update.mockResolvedValue({});
      mockPrisma.contributor.findUnique.mockResolvedValue({ id: 'reviewer-uuid' });
      mockPrisma.contribution.upsert.mockResolvedValue({ id: 'contribution-review-1' });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const job = createMockJob({
        eventType: 'pull_request_review',
        repositoryFullName: 'edin-org/edin-core',
        payload: reviewPayload,
        deliveryId: 'delivery-review-1',
      });

      await processor.process(job);

      expect(mockPrisma.contribution.upsert).toHaveBeenCalledTimes(1);

      const upsertCall = mockPrisma.contribution.upsert.mock.calls[0][0];
      expect(upsertCall.create.sourceRef).toBe('review-7890');
      expect(upsertCall.create.contributionType).toBe('CODE_REVIEW');
      expect(upsertCall.create.title).toBe('Review on PR #42: approved');
      expect(upsertCall.create.description).toBe('Looks good, minor nits.');
      expect(upsertCall.create.contributorId).toBe('reviewer-uuid');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'contribution.review.ingested',
        expect.objectContaining({
          contributionId: 'contribution-review-1',
          contributionType: 'CODE_REVIEW',
          correlationId: 'delivery-review-1',
        }),
      );
    });
  });

  // ─── Unknown event type (Task 8.1) ────────────────────────────────────

  describe('unknown event type handling', () => {
    it('should skip unknown event types without error', async () => {
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(mockRepository);
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(null);
      mockPrisma.webhookDelivery.upsert.mockResolvedValue({});
      mockPrisma.webhookDelivery.update.mockResolvedValue({});

      const job = createMockJob({
        eventType: 'issues',
        repositoryFullName: 'edin-org/edin-core',
        payload: { repository: { full_name: 'edin-org/edin-core' } },
        deliveryId: 'delivery-unknown',
      });

      await processor.process(job);

      expect(mockPrisma.contribution.upsert).not.toHaveBeenCalled();
      expect(mockPrisma.webhookDelivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
    });
  });

  // ─── Normalization tests (Task 8.2) ───────────────────────────────────

  describe('contribution normalization', () => {
    it('should use first line of commit message as title', async () => {
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(mockRepository);
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(null);
      mockPrisma.webhookDelivery.upsert.mockResolvedValue({});
      mockPrisma.webhookDelivery.update.mockResolvedValue({});
      mockPrisma.contributor.findUnique.mockResolvedValue(null);
      mockPrisma.contribution.upsert.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const job = createMockJob({
        eventType: 'push',
        repositoryFullName: 'edin-org/edin-core',
        payload: {
          sender: { id: 99999 },
          commits: [
            {
              id: 'sha123',
              author: { email: 'test@test.com' },
              message: 'First line title\n\nDetailed description here\nMore details',
              timestamp: '2026-03-05T10:00:00Z',
              added: [],
              removed: [],
              modified: [],
            },
          ],
          repository: { full_name: 'edin-org/edin-core' },
        },
        deliveryId: 'delivery-norm-1',
      });

      await processor.process(job);

      const upsertCall = mockPrisma.contribution.upsert.mock.calls[0][0];
      expect(upsertCall.create.title).toBe('First line title');
      expect(upsertCall.create.description).toContain('Detailed description here');
    });

    it('should store rawData as complete commit object', async () => {
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(mockRepository);
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(null);
      mockPrisma.webhookDelivery.upsert.mockResolvedValue({});
      mockPrisma.webhookDelivery.update.mockResolvedValue({});
      mockPrisma.contributor.findUnique.mockResolvedValue(null);
      mockPrisma.contribution.upsert.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const commitObj = {
        id: 'sha456',
        author: { email: 'dev@example.com', name: 'Dev' },
        message: 'test commit',
        timestamp: '2026-03-05T11:00:00Z',
        added: ['new-file.ts'],
        removed: [],
        modified: ['existing.ts'],
      };

      const job = createMockJob({
        eventType: 'push',
        repositoryFullName: 'edin-org/edin-core',
        payload: {
          sender: { id: 99999 },
          commits: [commitObj],
          repository: { full_name: 'edin-org/edin-core' },
        },
        deliveryId: 'delivery-raw-1',
      });

      await processor.process(job);

      const upsertCall = mockPrisma.contribution.upsert.mock.calls[0][0];
      expect(upsertCall.create.rawData).toEqual(
        expect.objectContaining({
          ...commitObj,
          extracted: expect.objectContaining({
            additions: 1,
            deletions: 0,
          }),
        }),
      );
    });

    it('should create audit log during batch persistence', async () => {
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(mockRepository);
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(null);
      mockPrisma.webhookDelivery.upsert.mockResolvedValue({});
      mockPrisma.webhookDelivery.update.mockResolvedValue({});
      mockPrisma.contributor.findUnique.mockResolvedValue(null);
      mockPrisma.contribution.upsert.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const job = createMockJob({
        eventType: 'push',
        repositoryFullName: 'edin-org/edin-core',
        payload: {
          sender: { id: 99999 },
          commits: [
            {
              id: 'sha1',
              author: {},
              message: 'commit 1',
              timestamp: '2026-03-05T10:00:00Z',
              added: [],
              removed: [],
              modified: [],
            },
          ],
          repository: { full_name: 'edin-org/edin-core' },
        },
        deliveryId: 'delivery-audit-1',
      });

      await processor.process(job);

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'contribution.batch.ingested',
            entityType: 'Contribution',
            correlationId: 'delivery-audit-1',
          }),
        }),
      );
    });
  });

  // ─── Idempotency tests (Task 8.3) ────────────────────────────────────

  describe('idempotency handling', () => {
    it('should skip duplicate delivery with COMPLETED status', async () => {
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(mockRepository);
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue({
        deliveryId: 'dup-delivery',
        status: 'COMPLETED',
        createdAt: new Date(),
      });

      const job = createMockJob({
        eventType: 'push',
        repositoryFullName: 'edin-org/edin-core',
        payload: { commits: [], repository: { full_name: 'edin-org/edin-core' } },
        deliveryId: 'dup-delivery',
      });

      await processor.process(job);

      expect(mockPrisma.webhookDelivery.upsert).not.toHaveBeenCalled();
      expect(mockPrisma.contribution.upsert).not.toHaveBeenCalled();
    });

    it('should skip delivery still in PROCESSING if not stale', async () => {
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(mockRepository);
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue({
        deliveryId: 'processing-delivery',
        status: 'PROCESSING',
        createdAt: new Date(), // Just created, not stale
      });

      const job = createMockJob({
        eventType: 'push',
        repositoryFullName: 'edin-org/edin-core',
        payload: { commits: [], repository: { full_name: 'edin-org/edin-core' } },
        deliveryId: 'processing-delivery',
      });

      await processor.process(job);

      expect(mockPrisma.webhookDelivery.upsert).not.toHaveBeenCalled();
    });

    it('should reprocess stale PROCESSING delivery (>5 min)', async () => {
      const staleDate = new Date(Date.now() - 6 * 60 * 1000); // 6 minutes ago
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(mockRepository);
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue({
        deliveryId: 'stale-delivery',
        status: 'PROCESSING',
        createdAt: staleDate,
      });
      mockPrisma.webhookDelivery.upsert.mockResolvedValue({});
      mockPrisma.webhookDelivery.update.mockResolvedValue({});

      const job = createMockJob({
        eventType: 'push',
        repositoryFullName: 'edin-org/edin-core',
        payload: {
          sender: {},
          commits: [],
          repository: { full_name: 'edin-org/edin-core' },
        },
        deliveryId: 'stale-delivery',
      });

      await processor.process(job);

      // Should proceed to upsert the delivery as PROCESSING
      expect(mockPrisma.webhookDelivery.upsert).toHaveBeenCalled();
    });
  });

  // ─── Rate limit handling tests (Task 8.4) ─────────────────────────────

  describe('rate limit handling', () => {
    it('should delay job on 429 response with reset time', async () => {
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(mockRepository);
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(null);
      mockPrisma.webhookDelivery.upsert.mockResolvedValue({});

      // Simulate a 429 error during processing
      const rateLimitError = Object.assign(new Error('Rate limited'), {
        status: 429,
        response: {
          status: 429,
          headers: {
            'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 60),
          },
        },
      });

      mockPrisma.$transaction.mockRejectedValue(rateLimitError);

      const moveToDelayed = vi.fn();
      const job = createMockJob(
        {
          eventType: 'push',
          repositoryFullName: 'edin-org/edin-core',
          payload: {
            sender: { id: 12345 },
            commits: [
              {
                id: 'sha1',
                author: {},
                message: 'test',
                timestamp: '2026-03-05T10:00:00Z',
                added: [],
                removed: [],
                modified: [],
              },
            ],
            repository: { full_name: 'edin-org/edin-core' },
          },
          deliveryId: 'delivery-rate-limit',
        },
        { moveToDelayed } as unknown as Partial<Job<WebhookJobData>>,
      );

      // This should not throw because rate limit is handled
      await processor.process(job);

      expect(moveToDelayed).toHaveBeenCalled();
    });
  });

  // ─── Contributor resolution tests (Task 8.5) ─────────────────────────

  describe('contributor resolution', () => {
    it('should resolve known GitHub user to contributorId', async () => {
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(mockRepository);
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(null);
      mockPrisma.webhookDelivery.upsert.mockResolvedValue({});
      mockPrisma.webhookDelivery.update.mockResolvedValue({});
      mockPrisma.contributor.findUnique.mockResolvedValue({ id: 'known-contributor' });
      mockPrisma.contribution.upsert.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const job = createMockJob({
        eventType: 'push',
        repositoryFullName: 'edin-org/edin-core',
        payload: {
          sender: { id: 12345 },
          commits: [
            {
              id: 'sha1',
              author: { email: 'known@test.com' },
              message: 'test commit',
              timestamp: '2026-03-05T10:00:00Z',
              added: [],
              removed: [],
              modified: [],
            },
          ],
          repository: { full_name: 'edin-org/edin-core' },
        },
        deliveryId: 'delivery-known-user',
      });

      await processor.process(job);

      expect(mockPrisma.contributor.findUnique).toHaveBeenCalledWith({
        where: { githubId: 12345 },
        select: { id: true },
      });

      const upsertCall = mockPrisma.contribution.upsert.mock.calls[0][0];
      expect(upsertCall.create.contributorId).toBe('known-contributor');
    });

    it('should store null contributorId for unknown GitHub user', async () => {
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(mockRepository);
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(null);
      mockPrisma.webhookDelivery.upsert.mockResolvedValue({});
      mockPrisma.webhookDelivery.update.mockResolvedValue({});
      mockPrisma.contributor.findUnique.mockResolvedValue(null);
      mockPrisma.contribution.upsert.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      const job = createMockJob({
        eventType: 'push',
        repositoryFullName: 'edin-org/edin-core',
        payload: {
          sender: { id: 99999 },
          commits: [
            {
              id: 'sha1',
              author: { email: 'unknown@test.com' },
              message: 'test commit',
              timestamp: '2026-03-05T10:00:00Z',
              added: [],
              removed: [],
              modified: [],
            },
          ],
          repository: { full_name: 'edin-org/edin-core' },
        },
        deliveryId: 'delivery-unknown-user',
      });

      await processor.process(job);

      const upsertCall = mockPrisma.contribution.upsert.mock.calls[0][0];
      expect(upsertCall.create.contributorId).toBeNull();
    });
  });

  // ─── Error handling (Task 8.1 / 7) ────────────────────────────────────

  describe('error handling', () => {
    it('should skip if repository not found', async () => {
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(null);

      const job = createMockJob({
        eventType: 'push',
        repositoryFullName: 'unknown-org/unknown-repo',
        payload: {},
        deliveryId: 'delivery-no-repo',
      });

      await processor.process(job);

      expect(mockPrisma.webhookDelivery.upsert).not.toHaveBeenCalled();
    });

    it('should mark delivery FAILED after final retry attempt', async () => {
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(mockRepository);
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(null);
      mockPrisma.webhookDelivery.upsert.mockResolvedValue({});
      mockPrisma.webhookDelivery.update.mockResolvedValue({});

      const processingError = new Error('Database connection lost');
      mockPrisma.$transaction.mockRejectedValue(processingError);

      const job = createMockJob(
        {
          eventType: 'push',
          repositoryFullName: 'edin-org/edin-core',
          payload: {
            sender: { id: 12345 },
            commits: [
              {
                id: 'sha1',
                author: {},
                message: 'test',
                timestamp: '2026-03-05T10:00:00Z',
                added: [],
                removed: [],
                modified: [],
              },
            ],
            repository: { full_name: 'edin-org/edin-core' },
          },
          deliveryId: 'delivery-fail',
        },
        { attemptsMade: 2 } as unknown as Partial<Job<WebhookJobData>>,
      );

      await expect(processor.process(job)).rejects.toThrow('Database connection lost');

      // On final attempt, delivery should be marked FAILED
      expect(mockPrisma.webhookDelivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deliveryId: 'delivery-fail' },
          data: { status: 'FAILED' },
        }),
      );
      expect(mockDlqQueue.add).toHaveBeenCalledWith(
        'dead-letter-webhook',
        expect.objectContaining({
          deliveryId: 'delivery-fail',
          errorMessage: 'Database connection lost',
        }),
        expect.objectContaining({ removeOnFail: false }),
      );
    });

    it('should not process individual commit failure and continue with others', async () => {
      mockPrisma.monitoredRepository.findUnique.mockResolvedValue(mockRepository);
      mockPrisma.webhookDelivery.findUnique.mockResolvedValue(null);
      mockPrisma.webhookDelivery.upsert.mockResolvedValue({});
      mockPrisma.webhookDelivery.update.mockResolvedValue({});
      mockPrisma.contribution.upsert.mockResolvedValue({});
      mockPrisma.auditLog.create.mockResolvedValue({});

      // First contributor resolution throws for first commit author, second succeeds
      mockPrisma.contributor.findUnique
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce(null);

      const job = createMockJob({
        eventType: 'push',
        repositoryFullName: 'edin-org/edin-core',
        payload: {
          sender: { id: 12345 },
          commits: [
            {
              id: 'sha-fail',
              author: {},
              message: 'will fail',
              timestamp: '2026-03-05T10:00:00Z',
              added: [],
              removed: [],
              modified: [],
            },
            {
              id: 'sha-ok',
              author: {},
              message: 'will succeed',
              timestamp: '2026-03-05T10:01:00Z',
              added: [],
              removed: [],
              modified: [],
            },
          ],
          repository: { full_name: 'edin-org/edin-core' },
        },
        deliveryId: 'delivery-partial',
      });

      await processor.process(job);

      // Only the second commit should be upserted (first one failed during extraction)
      expect(mockPrisma.contribution.upsert).toHaveBeenCalledTimes(1);
      const upsertCall = mockPrisma.contribution.upsert.mock.calls[0][0];
      expect(upsertCall.create.sourceRef).toBe('sha-ok');
    });
  });
});

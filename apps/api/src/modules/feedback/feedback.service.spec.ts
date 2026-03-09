import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { FeedbackService } from './feedback.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

const mockPrisma = {
  contribution: {
    findUnique: vi.fn(),
  },
  contributor: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  peerFeedback: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn((fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma)),
};

const mockQueue = {
  add: vi.fn(),
};

describe('FeedbackService', () => {
  let service: FeedbackService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        FeedbackService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('feedback-assignment'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get(FeedbackService);
    eventEmitter = module.get(EventEmitter2);
  });

  describe('assignReviewer', () => {
    it('selects reviewer with matching domain and lowest load', async () => {
      mockPrisma.contribution.findUnique.mockResolvedValue({
        id: 'contrib-1',
        contributorId: 'author-1',
        title: 'Fix bug',
        contributionType: 'COMMIT',
        contributor: { id: 'author-1', domain: 'Technology' },
      });
      mockPrisma.contributor.findMany.mockResolvedValue([
        { id: 'reviewer-1', domain: 'Technology' },
        { id: 'reviewer-2', domain: 'Technology' },
      ]);
      mockPrisma.peerFeedback.groupBy.mockResolvedValue([
        { reviewerId: 'reviewer-1', _count: { id: 3 } },
        { reviewerId: 'reviewer-2', _count: { id: 1 } },
      ]);
      mockPrisma.peerFeedback.create.mockResolvedValue({
        id: 'pf-1',
        contributionId: 'contrib-1',
        reviewerId: 'reviewer-2',
        status: 'ASSIGNED',
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.assignReviewer('contrib-1', 'corr-1');

      expect(result).not.toBeNull();
      expect(result!.reviewerId).toBe('reviewer-2');
      expect(mockPrisma.peerFeedback.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            contributionId: 'contrib-1',
            reviewerId: 'reviewer-2',
            status: 'ASSIGNED',
          }),
        }),
      );
    });

    it('excludes contribution author from candidates', async () => {
      mockPrisma.contribution.findUnique.mockResolvedValue({
        id: 'contrib-1',
        contributorId: 'author-1',
        title: 'Fix bug',
        contributionType: 'COMMIT',
        contributor: { id: 'author-1', domain: 'Technology' },
      });
      mockPrisma.contributor.findMany.mockResolvedValue([
        { id: 'reviewer-1', domain: 'Technology' },
      ]);
      mockPrisma.peerFeedback.groupBy.mockResolvedValue([]);
      mockPrisma.peerFeedback.create.mockResolvedValue({
        id: 'pf-1',
        contributionId: 'contrib-1',
        reviewerId: 'reviewer-1',
        status: 'ASSIGNED',
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.assignReviewer('contrib-1', 'corr-1');

      // The Prisma query should exclude the author
      expect(mockPrisma.contributor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { not: 'author-1' },
          }),
        }),
      );
    });

    it('excludes already-assigned reviewers', async () => {
      mockPrisma.contribution.findUnique.mockResolvedValue({
        id: 'contrib-1',
        contributorId: 'author-1',
        title: 'Fix bug',
        contributionType: 'COMMIT',
        contributor: { id: 'author-1', domain: 'Technology' },
      });
      mockPrisma.contributor.findMany.mockResolvedValue([
        { id: 'reviewer-1', domain: 'Technology' },
      ]);
      mockPrisma.peerFeedback.groupBy.mockResolvedValue([]);
      mockPrisma.peerFeedback.create.mockResolvedValue({
        id: 'pf-1',
        contributionId: 'contrib-1',
        reviewerId: 'reviewer-1',
        status: 'ASSIGNED',
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.assignReviewer('contrib-1', 'corr-1');

      // The Prisma query should exclude already-assigned reviewers via NOT
      expect(mockPrisma.contributor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            NOT: {
              peerFeedbacksGiven: {
                some: { contributionId: 'contrib-1' },
              },
            },
          }),
        }),
      );
    });

    it('randomizes among tied candidates', async () => {
      mockPrisma.contribution.findUnique.mockResolvedValue({
        id: 'contrib-1',
        contributorId: 'author-1',
        title: 'Fix bug',
        contributionType: 'COMMIT',
        contributor: { id: 'author-1', domain: 'Technology' },
      });
      // Multiple candidates with same load
      mockPrisma.contributor.findMany.mockResolvedValue([
        { id: 'reviewer-1', domain: 'Technology' },
        { id: 'reviewer-2', domain: 'Technology' },
        { id: 'reviewer-3', domain: 'Technology' },
      ]);
      mockPrisma.peerFeedback.groupBy.mockResolvedValue([]);
      mockPrisma.peerFeedback.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'pf-1',
          contributionId: data.contributionId,
          reviewerId: data.reviewerId,
          status: 'ASSIGNED',
        }),
      );
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.assignReviewer('contrib-1', 'corr-1');

      expect(result).not.toBeNull();
      expect(['reviewer-1', 'reviewer-2', 'reviewer-3']).toContain(result!.reviewerId);
    });

    it('returns null and logs warning when no eligible reviewer', async () => {
      mockPrisma.contribution.findUnique.mockResolvedValue({
        id: 'contrib-1',
        contributorId: 'author-1',
        title: 'Fix bug',
        contributionType: 'COMMIT',
        contributor: { id: 'author-1', domain: 'Technology' },
      });
      mockPrisma.contributor.findMany.mockResolvedValue([]);

      const result = await service.assignReviewer('contrib-1', 'corr-1');

      expect(result).toBeNull();
    });

    it('creates PeerFeedback record with ASSIGNED status', async () => {
      mockPrisma.contribution.findUnique.mockResolvedValue({
        id: 'contrib-1',
        contributorId: 'author-1',
        title: 'Fix bug',
        contributionType: 'COMMIT',
        contributor: { id: 'author-1', domain: 'Technology' },
      });
      mockPrisma.contributor.findMany.mockResolvedValue([
        { id: 'reviewer-1', domain: 'Technology' },
      ]);
      mockPrisma.peerFeedback.groupBy.mockResolvedValue([]);
      mockPrisma.peerFeedback.create.mockResolvedValue({
        id: 'pf-1',
        contributionId: 'contrib-1',
        reviewerId: 'reviewer-1',
        status: 'ASSIGNED',
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.assignReviewer('contrib-1', 'corr-1');

      expect(mockPrisma.peerFeedback.create).toHaveBeenCalledWith({
        data: {
          contributionId: 'contrib-1',
          reviewerId: 'reviewer-1',
          status: 'ASSIGNED',
        },
      });
    });

    it('emits feedback.review.assigned event', async () => {
      const emitSpy = vi.spyOn(eventEmitter, 'emit');

      mockPrisma.contribution.findUnique.mockResolvedValue({
        id: 'contrib-1',
        contributorId: 'author-1',
        title: 'Fix bug',
        contributionType: 'COMMIT',
        contributor: { id: 'author-1', domain: 'Technology' },
      });
      mockPrisma.contributor.findMany.mockResolvedValue([
        { id: 'reviewer-1', domain: 'Technology' },
      ]);
      mockPrisma.peerFeedback.groupBy.mockResolvedValue([]);
      mockPrisma.peerFeedback.create.mockResolvedValue({
        id: 'pf-1',
        contributionId: 'contrib-1',
        reviewerId: 'reviewer-1',
        status: 'ASSIGNED',
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.assignReviewer('contrib-1', 'corr-1');

      expect(emitSpy).toHaveBeenCalledWith(
        'feedback.review.assigned',
        expect.objectContaining({
          eventType: 'feedback.review.assigned',
          payload: expect.objectContaining({
            peerFeedbackId: 'pf-1',
            contributionId: 'contrib-1',
            reviewerId: 'reviewer-1',
          }),
        }),
      );
    });

    it('creates audit log entry for automatic assignment', async () => {
      mockPrisma.contribution.findUnique.mockResolvedValue({
        id: 'contrib-1',
        contributorId: 'author-1',
        title: 'Fix bug',
        contributionType: 'COMMIT',
        contributor: { id: 'author-1', domain: 'Technology' },
      });
      mockPrisma.contributor.findMany.mockResolvedValue([
        { id: 'reviewer-1', domain: 'Technology' },
      ]);
      mockPrisma.peerFeedback.groupBy.mockResolvedValue([]);
      mockPrisma.peerFeedback.create.mockResolvedValue({
        id: 'pf-1',
        contributionId: 'contrib-1',
        reviewerId: 'reviewer-1',
        status: 'ASSIGNED',
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.assignReviewer('contrib-1', 'corr-1');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'FEEDBACK_AUTO_ASSIGNED',
          entityType: 'PeerFeedback',
          entityId: 'pf-1',
          correlationId: 'corr-1',
        }),
      });
    });
  });

  describe('adminAssignReviewer', () => {
    it('throws DomainException when contribution not found', async () => {
      mockPrisma.contribution.findUnique.mockResolvedValue(null);

      await expect(
        service.adminAssignReviewer('missing-contrib', 'reviewer-1', 'admin-1', 'corr-1'),
      ).rejects.toThrow(DomainException);
    });

    it('creates record for specified reviewer', async () => {
      mockPrisma.contribution.findUnique.mockResolvedValue({
        id: 'contrib-1',
        contributorId: 'author-1',
        title: 'Fix bug',
        contributionType: 'COMMIT',
        contributor: { id: 'author-1', domain: 'Technology' },
      });
      mockPrisma.peerFeedback.create.mockResolvedValue({
        id: 'pf-1',
        contributionId: 'contrib-1',
        reviewerId: 'reviewer-1',
        status: 'ASSIGNED',
        assignedBy: 'admin-1',
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.adminAssignReviewer(
        'contrib-1',
        'reviewer-1',
        'admin-1',
        'corr-1',
      );

      expect(result.reviewerId).toBe('reviewer-1');
      expect(mockPrisma.peerFeedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contributionId: 'contrib-1',
          reviewerId: 'reviewer-1',
          assignedBy: 'admin-1',
        }),
      });
    });

    it('creates audit log entry with admin actor', async () => {
      mockPrisma.contribution.findUnique.mockResolvedValue({
        id: 'contrib-1',
        contributorId: 'author-1',
        title: 'Fix bug',
        contributionType: 'COMMIT',
        contributor: { id: 'author-1', domain: 'Technology' },
      });
      mockPrisma.peerFeedback.create.mockResolvedValue({
        id: 'pf-1',
        contributionId: 'contrib-1',
        reviewerId: 'reviewer-1',
        status: 'ASSIGNED',
        assignedBy: 'admin-1',
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.adminAssignReviewer('contrib-1', 'reviewer-1', 'admin-1', 'corr-1');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'admin-1',
          action: 'FEEDBACK_ADMIN_ASSIGNED',
          entityType: 'PeerFeedback',
        }),
      });
    });
  });

  describe('getAssignmentsForReviewer', () => {
    it('returns paginated assignments', async () => {
      const assignments = [
        {
          id: 'pf-1',
          contributionId: 'contrib-1',
          reviewerId: 'reviewer-1',
          status: 'ASSIGNED',
          assignedBy: null,
          assignedAt: new Date('2026-03-08T10:00:00Z'),
          submittedAt: null,
          contribution: {
            id: 'contrib-1',
            title: 'Fix auth bug',
            contributionType: 'COMMIT',
          },
        },
      ];

      mockPrisma.peerFeedback.findMany.mockResolvedValue(assignments);
      mockPrisma.peerFeedback.count.mockResolvedValue(1);

      const result = await service.getAssignmentsForReviewer('reviewer-1', { limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].status).toBe('ASSIGNED');
      expect(result.items[0].contributionTitle).toBe('Fix auth bug');
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.total).toBe(1);
    });
  });

  describe('submitFeedback', () => {
    const validSubmission = {
      responses: [
        {
          questionId: 'code-quality',
          rating: 4,
          comment: 'Great code quality and readability throughout',
        },
        {
          questionId: 'technical-approach',
          rating: 3,
          comment: 'The approach works but could be improved',
        },
        {
          questionId: 'testing',
          rating: 4,
          comment: 'Good test coverage and error handling present',
        },
        {
          questionId: 'documentation',
          rating: 3,
          comment: 'Documentation is adequate and clear enough',
        },
        { questionId: 'impact', rating: 5, comment: 'Significant positive impact on the project' },
      ],
      overallComment: 'Good work overall',
    };

    const mockFeedbackRecord = {
      id: 'pf-1',
      contributionId: 'contrib-1',
      reviewerId: 'reviewer-1',
      status: 'ASSIGNED',
      contribution: {
        id: 'contrib-1',
        title: 'Fix auth bug',
        contributionType: 'COMMIT',
        contributorId: 'author-1',
        contributor: { domain: 'Technology' },
      },
    };

    it('updates status to COMPLETED and stores rubric data', async () => {
      mockPrisma.peerFeedback.findUnique.mockResolvedValue(mockFeedbackRecord);
      mockPrisma.peerFeedback.update.mockResolvedValue({
        ...mockFeedbackRecord,
        status: 'COMPLETED',
        submittedAt: new Date(),
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      const result = await service.submitFeedback('pf-1', validSubmission, 'reviewer-1', 'corr-1');

      expect(result.status).toBe('COMPLETED');
      expect(mockPrisma.peerFeedback.update).toHaveBeenCalledWith({
        where: { id: 'pf-1' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          ratings: expect.objectContaining({
            rubricVersion: '1.0',
            responses: validSubmission.responses,
          }),
          comments: 'Good work overall',
          submittedAt: expect.any(Date),
        }),
      });
    });

    it('emits feedback.review.submitted event with correct payload', async () => {
      const emitSpy = vi.spyOn(eventEmitter, 'emit');
      mockPrisma.peerFeedback.findUnique.mockResolvedValue(mockFeedbackRecord);
      mockPrisma.peerFeedback.update.mockResolvedValue({
        ...mockFeedbackRecord,
        status: 'COMPLETED',
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.submitFeedback('pf-1', validSubmission, 'reviewer-1', 'corr-1');

      expect(emitSpy).toHaveBeenCalledWith(
        'feedback.review.submitted',
        expect.objectContaining({
          eventType: 'feedback.review.submitted',
          actorId: 'reviewer-1',
          payload: expect.objectContaining({
            peerFeedbackId: 'pf-1',
            contributionId: 'contrib-1',
            reviewerId: 'reviewer-1',
            contributorId: 'author-1',
            contributionTitle: 'Fix auth bug',
            contributionType: 'COMMIT',
          }),
        }),
      );
    });

    it('creates audit log entry inside transaction', async () => {
      mockPrisma.peerFeedback.findUnique.mockResolvedValue(mockFeedbackRecord);
      mockPrisma.peerFeedback.update.mockResolvedValue({
        ...mockFeedbackRecord,
        status: 'COMPLETED',
      });
      mockPrisma.auditLog.create.mockResolvedValue({});

      await service.submitFeedback('pf-1', validSubmission, 'reviewer-1', 'corr-1');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'reviewer-1',
          action: 'FEEDBACK_SUBMITTED',
          entityType: 'PeerFeedback',
          entityId: 'pf-1',
          correlationId: 'corr-1',
        }),
      });
    });

    it('rejects when feedback not found (404)', async () => {
      mockPrisma.peerFeedback.findUnique.mockResolvedValue(null);

      await expect(
        service.submitFeedback('pf-missing', validSubmission, 'reviewer-1', 'corr-1'),
      ).rejects.toThrow(DomainException);
    });

    it('rejects when reviewer does not match (403)', async () => {
      mockPrisma.peerFeedback.findUnique.mockResolvedValue(mockFeedbackRecord);

      await expect(
        service.submitFeedback('pf-1', validSubmission, 'wrong-reviewer', 'corr-1'),
      ).rejects.toThrow(DomainException);
    });

    it('rejects when status is not ASSIGNED (409 ALREADY_SUBMITTED)', async () => {
      mockPrisma.peerFeedback.findUnique.mockResolvedValue({
        ...mockFeedbackRecord,
        status: 'COMPLETED',
      });

      await expect(
        service.submitFeedback('pf-1', validSubmission, 'reviewer-1', 'corr-1'),
      ).rejects.toThrow(DomainException);
    });

    it('rejects when status is REASSIGNED (400 INVALID_STATUS)', async () => {
      mockPrisma.peerFeedback.findUnique.mockResolvedValue({
        ...mockFeedbackRecord,
        status: 'REASSIGNED',
      });

      await expect(
        service.submitFeedback('pf-1', validSubmission, 'reviewer-1', 'corr-1'),
      ).rejects.toThrow(DomainException);
    });

    it('rejects when not all required rubric questions are answered', async () => {
      mockPrisma.peerFeedback.findUnique.mockResolvedValue(mockFeedbackRecord);

      const incompleteSubmission = {
        responses: [
          {
            questionId: 'code-quality',
            rating: 4,
            comment: 'Great code quality and readability throughout',
          },
        ],
      };

      await expect(
        service.submitFeedback('pf-1', incompleteSubmission, 'reviewer-1', 'corr-1'),
      ).rejects.toThrow(DomainException);
    });

    it('rejects when rubric responses have comments below minimum length', async () => {
      mockPrisma.peerFeedback.findUnique.mockResolvedValue(mockFeedbackRecord);

      const shortCommentSubmission = {
        responses: [{ questionId: 'code-quality', rating: 4, comment: 'Too short' }],
      };

      await expect(
        service.submitFeedback('pf-1', shortCommentSubmission, 'reviewer-1', 'corr-1'),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('getAssignmentById', () => {
    it('returns enriched feedback with contribution context', async () => {
      mockPrisma.peerFeedback.findUnique.mockResolvedValue({
        id: 'pf-1',
        contributionId: 'contrib-1',
        reviewerId: 'reviewer-1',
        status: 'ASSIGNED',
        ratings: null,
        comments: null,
        assignedBy: null,
        assignedAt: new Date('2026-03-08T10:00:00Z'),
        submittedAt: null,
        contribution: {
          id: 'contrib-1',
          title: 'Fix auth bug',
          description: 'Fixes the OAuth flow issue',
          contributionType: 'COMMIT',
          contributorId: 'author-1',
          contributor: { name: 'Alice', domain: 'Technology' },
        },
      });

      const result = await service.getAssignmentById('pf-1', 'reviewer-1');

      expect(result.id).toBe('pf-1');
      expect(result.contribution.title).toBe('Fix auth bug');
      expect(result.contribution.description).toBe('Fixes the OAuth flow issue');
      expect(result.contributorName).toBe('Alice');
    });

    it('throws when feedback not found or reviewer mismatch', async () => {
      mockPrisma.peerFeedback.findUnique.mockResolvedValue(null);

      await expect(service.getAssignmentById('pf-missing', 'reviewer-1')).rejects.toThrow(
        DomainException,
      );
    });

    it('throws when reviewer does not match', async () => {
      mockPrisma.peerFeedback.findUnique.mockResolvedValue({
        id: 'pf-1',
        reviewerId: 'other-reviewer',
        contribution: {
          id: 'c',
          title: 't',
          description: null,
          contributionType: 'COMMIT',
          contributorId: 'a',
          contributor: { name: 'A', domain: 'Technology' },
        },
      });

      await expect(service.getAssignmentById('pf-1', 'reviewer-1')).rejects.toThrow(
        DomainException,
      );
    });
  });

  describe('getReceivedFeedback', () => {
    it('returns paginated COMPLETED feedback for contributor contributions', async () => {
      const feedbackItems = [
        {
          id: 'pf-1',
          contributionId: 'contrib-1',
          reviewerId: 'reviewer-1',
          status: 'COMPLETED',
          ratings: { rubricVersion: '1.0', responses: [] },
          comments: 'Great work',
          submittedAt: new Date('2026-03-08T12:00:00Z'),
          reviewer: { id: 'reviewer-1', name: 'Bob', avatarUrl: null, domain: 'Technology' },
          contribution: { id: 'contrib-1', title: 'Fix auth', contributionType: 'COMMIT' },
        },
      ];

      mockPrisma.peerFeedback.findMany.mockResolvedValue(feedbackItems);
      mockPrisma.peerFeedback.count.mockResolvedValue(1);

      const result = await service.getReceivedFeedback('author-1', { limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].reviewer.name).toBe('Bob');
      expect(result.items[0].contribution.title).toBe('Fix auth');
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.total).toBe(1);
    });

    it('includes reviewer info and rubric data', async () => {
      const rubricData = {
        rubricVersion: '1.0',
        responses: [{ questionId: 'code-quality', rating: 4, comment: 'Well-written code' }],
      };

      mockPrisma.peerFeedback.findMany.mockResolvedValue([
        {
          id: 'pf-1',
          contributionId: 'contrib-1',
          reviewerId: 'reviewer-1',
          status: 'COMPLETED',
          ratings: rubricData,
          comments: 'Overall good',
          submittedAt: new Date('2026-03-08T12:00:00Z'),
          reviewer: {
            id: 'reviewer-1',
            name: 'Bob',
            avatarUrl: 'https://avatar.url',
            domain: 'Fintech',
          },
          contribution: { id: 'contrib-1', title: 'PR #42', contributionType: 'PULL_REQUEST' },
        },
      ]);
      mockPrisma.peerFeedback.count.mockResolvedValue(1);

      const result = await service.getReceivedFeedback('author-1', { limit: 20 });

      expect(result.items[0].ratings).toEqual(rubricData);
      expect(result.items[0].reviewer.avatarUrl).toBe('https://avatar.url');
      expect(result.items[0].reviewer.domain).toBe('Fintech');
    });
  });

  describe('event listeners', () => {
    it('dispatches job to feedback-assignment queue', async () => {
      mockPrisma.contribution.findUnique.mockResolvedValue({
        title: 'Fix bug',
        contributor: { domain: 'Technology' },
      });
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      await service.handleCommitIngested({
        contributionId: 'contrib-1',
        contributionType: 'COMMIT',
        contributorId: 'author-1',
        repositoryId: 'repo-1',
        correlationId: 'corr-1',
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'assign-reviewer',
        expect.objectContaining({
          contributionId: 'contrib-1',
          contributorId: 'author-1',
          contributorDomain: 'Technology',
          contributionTitle: 'Fix bug',
          contributionType: 'COMMIT',
          correlationId: 'corr-1',
        }),
        expect.any(Object),
      );
    });

    it('skips when contributorId is null', async () => {
      await service.handleCommitIngested({
        contributionId: 'contrib-1',
        contributionType: 'COMMIT',
        contributorId: null,
        repositoryId: 'repo-1',
        correlationId: 'corr-1',
      });

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('fetches contribution title and contributor domain from DB in single query', async () => {
      mockPrisma.contribution.findUnique.mockResolvedValue({
        title: 'Add feature',
        contributor: { domain: 'Fintech' },
      });
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      await service.handlePrIngested({
        contributionId: 'contrib-2',
        contributionType: 'PULL_REQUEST',
        contributorId: 'author-2',
        repositoryId: 'repo-1',
        correlationId: 'corr-2',
      });

      expect(mockPrisma.contribution.findUnique).toHaveBeenCalledWith({
        where: { id: 'contrib-2' },
        select: {
          title: true,
          contributor: { select: { domain: true } },
        },
      });
      expect(mockQueue.add).toHaveBeenCalledWith(
        'assign-reviewer',
        expect.objectContaining({
          contributorDomain: 'Fintech',
          contributionTitle: 'Add feature',
        }),
        expect.any(Object),
      );
    });
  });
});

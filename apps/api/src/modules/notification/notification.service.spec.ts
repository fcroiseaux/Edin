import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificationService } from './notification.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const mockPrisma = {
  notification: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    groupBy: vi.fn(),
  },
  workingGroup: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  workingGroupMember: {
    findMany: vi.fn(),
  },
  contributor: {
    findUnique: vi.fn(),
  },
  contribution: {
    findUnique: vi.fn(),
  },
};

const mockQueue = {
  add: vi.fn(),
  addBulk: vi.fn(),
};

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: getQueueToken('notification'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get(NotificationService);
  });

  describe('getNotifications', () => {
    it('returns paginated notifications for a contributor', async () => {
      const notifications = [
        {
          id: 'n-1',
          contributorId: 'user-1',
          type: 'ANNOUNCEMENT_POSTED',
          title: 'New announcement',
          description: 'Welcome!',
          entityId: 'ann-1',
          category: 'working-groups',
          read: false,
          createdAt: new Date('2026-03-08T10:00:00Z'),
          readAt: null,
        },
      ];

      mockPrisma.notification.findMany.mockResolvedValue(notifications);
      mockPrisma.notification.count.mockResolvedValue(1);

      const result = await service.getNotifications('user-1', { limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe('ANNOUNCEMENT_POSTED');
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.total).toBe(1);
    });

    it('filters by category', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.notification.count.mockResolvedValue(0);

      await service.getNotifications('user-1', { limit: 20, category: 'working-groups' });

      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ category: 'working-groups' }),
        }),
      );
    });

    it('handles cursor-based pagination with composite cursor', async () => {
      const notifications = Array.from({ length: 21 }, (_, i) => ({
        id: `n-${i}`,
        contributorId: 'user-1',
        type: 'ANNOUNCEMENT_POSTED',
        title: `Notification ${i}`,
        description: null,
        entityId: `entity-${i}`,
        category: 'working-groups',
        read: false,
        createdAt: new Date(Date.now() - i * 60000),
        readAt: null,
      }));

      mockPrisma.notification.findMany.mockResolvedValue(notifications);
      mockPrisma.notification.count.mockResolvedValue(50);

      const result = await service.getNotifications('user-1', { limit: 20 });

      expect(result.items).toHaveLength(20);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.cursor).toContain('|');
      expect(result.pagination.cursor!.split('|')).toHaveLength(2);
    });
  });

  describe('markAsRead', () => {
    it('marks a notification as read and sets readAt', async () => {
      const now = new Date();
      mockPrisma.notification.findFirst.mockResolvedValue({
        id: 'n-1',
        contributorId: 'user-1',
        read: false,
      });
      mockPrisma.notification.update.mockResolvedValue({
        id: 'n-1',
        read: true,
        readAt: now,
      });

      const result = await service.markAsRead('n-1', 'user-1');

      expect(result).toEqual({
        read: true,
        readAt: now.toISOString(),
      });
      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 'n-1' },
        data: { read: true, readAt: expect.any(Date) },
      });
    });

    it('returns null when notification not found or not owned', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue(null);

      const result = await service.markAsRead('n-999', 'user-1');

      expect(result).toBeNull();
      expect(mockPrisma.notification.update).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('marks all unread notifications for contributor', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.markAllAsRead('user-1');

      expect(result).toEqual({ count: 5 });
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { contributorId: 'user-1', read: false },
        data: { read: true, readAt: expect.any(Date) },
      });
    });

    it('filters by category when provided', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 2 });

      await service.markAllAsRead('user-1', 'working-groups');

      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: { contributorId: 'user-1', read: false, category: 'working-groups' },
        data: { read: true, readAt: expect.any(Date) },
      });
    });
  });

  describe('getUnreadCounts', () => {
    it('returns per-category unread counts', async () => {
      mockPrisma.notification.groupBy.mockResolvedValue([
        { category: 'working-groups', _count: { id: 3 } },
        { category: 'evaluations', _count: { id: 1 } },
      ]);

      const result = await service.getUnreadCounts('user-1');

      expect(result).toEqual({
        'working-groups': 3,
        evaluations: 1,
      });
    });

    it('returns empty object when no unread notifications', async () => {
      mockPrisma.notification.groupBy.mockResolvedValue([]);

      const result = await service.getUnreadCounts('user-1');

      expect(result).toEqual({});
    });
  });

  describe('enqueueNotification', () => {
    it('adds job to notification queue', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      await service.enqueueNotification({
        contributorId: 'user-1',
        type: 'ANNOUNCEMENT_POSTED',
        title: 'New announcement',
        description: 'Test',
        entityId: 'ann-1',
        category: 'working-groups',
        correlationId: 'corr-1',
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-notification',
        expect.objectContaining({
          contributorId: 'user-1',
          type: 'ANNOUNCEMENT_POSTED',
        }),
        expect.any(Object),
      );
    });
  });

  describe('event listeners', () => {
    it('enqueues notifications for WG members on announcement via addBulk', async () => {
      mockPrisma.workingGroup.findUnique.mockResolvedValue({
        id: 'wg-1',
        name: 'Technology',
      });
      mockPrisma.workingGroupMember.findMany.mockResolvedValue([
        { contributorId: 'user-1' },
        { contributorId: 'user-2' },
        { contributorId: 'author-1' }, // author should be skipped
      ]);
      mockQueue.addBulk.mockResolvedValue([{ id: 'job-1' }, { id: 'job-2' }]);

      await service.handleAnnouncementCreated({
        eventType: 'working-group.announcement.created',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-1',
        actorId: 'author-1',
        payload: {
          announcementId: 'ann-1',
          workingGroupId: 'wg-1',
          authorId: 'author-1',
          content: 'Welcome to the team!',
        },
      });

      // Should enqueue bulk for 2 members (excluding author)
      expect(mockQueue.addBulk).toHaveBeenCalledTimes(1);
      const jobs = mockQueue.addBulk.mock.calls[0][0] as Array<{
        name: string;
        data: { contributorId: string };
      }>;
      expect(jobs).toHaveLength(2);
      const recipientIds = jobs.map((j) => j.data.contributorId);
      expect(recipientIds).toContain('user-1');
      expect(recipientIds).toContain('user-2');
      expect(recipientIds).not.toContain('author-1');
    });

    it('enqueues notification for WG Lead on contribution', async () => {
      mockPrisma.contributor.findUnique.mockResolvedValue({ domain: 'Technology' });
      mockPrisma.workingGroup.findFirst.mockResolvedValue({
        leadContributorId: 'lead-1',
        name: 'Technology',
      });
      mockPrisma.contribution.findUnique.mockResolvedValue({
        title: 'Fix auth bug',
        contributionType: 'COMMIT',
      });
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      await service.handleCommitIngested({
        contributionId: 'contrib-1',
        contributionType: 'COMMIT',
        contributorId: 'user-1',
        repositoryId: 'repo-1',
        correlationId: 'corr-2',
      });

      expect(mockQueue.add).toHaveBeenCalledTimes(1);
      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-notification',
        expect.objectContaining({
          contributorId: 'lead-1',
          type: 'CONTRIBUTION_TO_DOMAIN',
        }),
        expect.any(Object),
      );
    });

    it('skips unattributed contributions (no contributorId)', async () => {
      await service.handleCommitIngested({
        contributionId: 'contrib-1',
        contributionType: 'COMMIT',
        contributorId: null,
        repositoryId: 'repo-1',
        correlationId: 'corr-3',
      });

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('skips notification when contributor is the WG lead (self-notification)', async () => {
      mockPrisma.contributor.findUnique.mockResolvedValue({ domain: 'Technology' });
      mockPrisma.workingGroup.findFirst.mockResolvedValue({
        leadContributorId: 'user-1', // same as contributor
        name: 'Technology',
      });

      await service.handleCommitIngested({
        contributionId: 'contrib-1',
        contributionType: 'COMMIT',
        contributorId: 'user-1',
        repositoryId: 'repo-1',
        correlationId: 'corr-4',
      });

      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('enqueues notification for reviewer on feedback.review.assigned', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      await service.handleFeedbackReviewAssigned({
        eventType: 'feedback.review.assigned',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-5',
        actorId: 'system',
        payload: {
          peerFeedbackId: 'pf-1',
          contributionId: 'contrib-1',
          reviewerId: 'reviewer-1',
          contributionTitle: 'Fix auth bug',
          contributionType: 'COMMIT',
          domain: 'Technology',
        },
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-notification',
        expect.objectContaining({
          contributorId: 'reviewer-1',
          type: 'PEER_FEEDBACK_AVAILABLE',
          category: 'feedback',
        }),
        expect.any(Object),
      );
    });

    it('enqueues notification for contribution author on feedback.review.submitted', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      await service.handleFeedbackReviewSubmitted({
        eventType: 'feedback.review.submitted',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-10',
        actorId: 'reviewer-1',
        payload: {
          peerFeedbackId: 'pf-1',
          contributionId: 'contrib-1',
          reviewerId: 'reviewer-1',
          contributorId: 'author-1',
          contributionTitle: 'Fix auth bug',
          contributionType: 'COMMIT',
          domain: 'Technology',
        },
      });

      expect(mockQueue.add).toHaveBeenCalledWith(
        'send-notification',
        expect.objectContaining({
          contributorId: 'author-1',
          type: 'PEER_FEEDBACK_RECEIVED',
          category: 'feedback',
        }),
        expect.any(Object),
      );
    });

    it('feedback submitted notification has correct type and targets contribution author', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      await service.handleFeedbackReviewSubmitted({
        eventType: 'feedback.review.submitted',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-11',
        actorId: 'reviewer-2',
        payload: {
          peerFeedbackId: 'pf-2',
          contributionId: 'contrib-2',
          reviewerId: 'reviewer-2',
          contributorId: 'author-2',
          contributionTitle: 'Add payment flow',
          contributionType: 'PULL_REQUEST',
          domain: 'Fintech',
        },
      });

      const callArgs = mockQueue.add.mock.calls[0][1];
      expect(callArgs.type).toBe('PEER_FEEDBACK_RECEIVED');
      expect(callArgs.category).toBe('feedback');
      expect(callArgs.contributorId).toBe('author-2');
      expect(callArgs.title).toBe("You've received feedback on your contribution");
      expect(callArgs.description).toBe('Feedback on pull request: Add payment flow');
    });

    it('notification has correct type PEER_FEEDBACK_AVAILABLE and category feedback', async () => {
      mockQueue.add.mockResolvedValue({ id: 'job-1' });

      await service.handleFeedbackReviewAssigned({
        eventType: 'feedback.review.assigned',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-6',
        actorId: 'system',
        payload: {
          peerFeedbackId: 'pf-2',
          contributionId: 'contrib-2',
          reviewerId: 'reviewer-2',
          contributionTitle: 'Add payment flow',
          contributionType: 'PULL_REQUEST',
          domain: 'Fintech',
        },
      });

      const callArgs = mockQueue.add.mock.calls[0][1];
      expect(callArgs.type).toBe('PEER_FEEDBACK_AVAILABLE');
      expect(callArgs.category).toBe('feedback');
      expect(callArgs.title).toBe("You've been asked to review a contribution");
      expect(callArgs.description).toBe('Review pull request: Add payment flow');
    });
  });
});

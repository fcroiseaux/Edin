import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { ActivityService } from './activity.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { EventEmitterModule } from '@nestjs/event-emitter';

const mockPrisma = {
  activityEvent: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
  contribution: {
    findUnique: vi.fn(),
  },
  workingGroup: {
    findUnique: vi.fn(),
  },
  contributor: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
};

const mockRedis = {
  publish: vi.fn(),
};

describe('ActivityService', () => {
  let service: ActivityService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        ActivityService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get(ActivityService);
  });

  describe('getFeed', () => {
    it('returns paginated activity events', async () => {
      const events = [
        {
          id: 'event-1',
          eventType: 'CONTRIBUTION_NEW',
          title: 'New Commit: Fix auth',
          description: null,
          contributorId: 'contrib-1',
          domain: 'Technology',
          contributionType: 'COMMIT',
          entityId: 'entity-1',
          metadata: null,
          createdAt: new Date('2026-03-08T10:00:00Z'),
          contributor: { id: 'contrib-1', name: 'Alice', avatarUrl: null },
        },
      ];

      mockPrisma.activityEvent.findMany.mockResolvedValue(events);
      mockPrisma.activityEvent.count.mockResolvedValue(1);

      const result = await service.getFeed({ limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].eventType).toBe('CONTRIBUTION_NEW');
      expect(result.items[0].contributorName).toBe('Alice');
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.total).toBe(1);
    });

    it('handles cursor-based pagination with composite cursor', async () => {
      const events = Array.from({ length: 21 }, (_, i) => ({
        id: `event-${i}`,
        eventType: 'CONTRIBUTION_NEW',
        title: `Event ${i}`,
        description: null,
        contributorId: 'contrib-1',
        domain: 'Technology',
        contributionType: 'COMMIT',
        entityId: `entity-${i}`,
        metadata: null,
        createdAt: new Date(Date.now() - i * 60000),
        contributor: { id: 'contrib-1', name: 'Alice', avatarUrl: null },
      }));

      mockPrisma.activityEvent.findMany.mockResolvedValue(events);
      mockPrisma.activityEvent.count.mockResolvedValue(50);

      const result = await service.getFeed({ limit: 20 });

      expect(result.items).toHaveLength(20);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.cursor).toBeTruthy();
      // Cursor should be composite: createdAt|id
      expect(result.pagination.cursor).toContain('|');
      expect(result.pagination.cursor!.split('|')).toHaveLength(2);
    });

    it('filters by domain', async () => {
      mockPrisma.activityEvent.findMany.mockResolvedValue([]);
      mockPrisma.activityEvent.count.mockResolvedValue(0);

      await service.getFeed({ limit: 20, domain: 'Finance' });

      expect(mockPrisma.activityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ domain: 'Finance' }),
        }),
      );
    });

    it('returns empty results when no events exist', async () => {
      mockPrisma.activityEvent.findMany.mockResolvedValue([]);
      mockPrisma.activityEvent.count.mockResolvedValue(0);

      const result = await service.getFeed({ limit: 20 });

      expect(result.items).toHaveLength(0);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.cursor).toBeNull();
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('getPublicFeed', () => {
    it('strips sensitive fields from response', async () => {
      const events = [
        {
          id: 'event-1',
          eventType: 'CONTRIBUTION_NEW',
          title: 'New Commit',
          description: null,
          contributorId: 'contrib-1',
          domain: 'Technology',
          contributionType: 'COMMIT',
          entityId: 'entity-1',
          metadata: { sourceRef: 'abc123' },
          createdAt: new Date('2026-03-08T10:00:00Z'),
          contributor: { id: 'contrib-1', name: 'Alice', avatarUrl: null },
        },
      ];

      mockPrisma.activityEvent.findMany.mockResolvedValue(events);
      mockPrisma.activityEvent.count.mockResolvedValue(1);

      const result = await service.getPublicFeed({ limit: 20 });

      expect(result.items[0]).not.toHaveProperty('contributorId');
      expect(result.items[0]).not.toHaveProperty('metadata');
      expect(result.items[0]).toHaveProperty('contributorName');
    });
  });

  describe('createActivityEvent', () => {
    it('writes to database and publishes to Redis', async () => {
      const created = {
        id: 'event-1',
        eventType: 'CONTRIBUTION_NEW',
        title: 'New Commit: Fix auth',
        description: null,
        contributorId: 'contrib-1',
        domain: 'Technology',
        contributionType: 'COMMIT',
        entityId: 'entity-1',
        metadata: null,
        createdAt: new Date('2026-03-08T10:00:00Z'),
        contributor: { id: 'contrib-1', name: 'Alice', avatarUrl: null },
      };

      mockPrisma.activityEvent.create.mockResolvedValue(created);

      await service.createActivityEvent({
        eventType: 'CONTRIBUTION_NEW',
        title: 'New Commit: Fix auth',
        contributorId: 'contrib-1',
        domain: 'Technology' as never,
        contributionType: 'COMMIT' as never,
        entityId: 'entity-1',
      });

      expect(mockPrisma.activityEvent.create).toHaveBeenCalledTimes(1);
      expect(mockRedis.publish).toHaveBeenCalledWith(
        'activity-feed',
        expect.stringContaining('"type":"activity.new"'),
      );
    });
  });

  describe('event listeners', () => {
    it('handles contribution.commit.ingested event', async () => {
      const contribution = {
        id: 'contrib-id',
        title: 'Fix authentication bug',
        description: 'Fixed the OAuth flow',
        contributorId: 'user-1',
        contributionType: 'COMMIT',
        sourceRef: 'abc123',
        contributor: { domain: 'Technology' },
        repository: { fullName: 'edin/platform' },
      };

      mockPrisma.contribution.findUnique.mockResolvedValue(contribution);
      mockPrisma.activityEvent.create.mockResolvedValue({
        ...contribution,
        id: 'event-1',
        eventType: 'CONTRIBUTION_NEW',
        entityId: 'contrib-id',
        metadata: null,
        createdAt: new Date(),
        contributor: { id: 'user-1', name: 'Alice', avatarUrl: null },
      });

      await service.handleCommitIngested({
        contributionId: 'contrib-id',
        contributionType: 'COMMIT',
        contributorId: 'user-1',
        repositoryId: 'repo-1',
        correlationId: 'corr-1',
      });

      expect(mockPrisma.activityEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'CONTRIBUTION_NEW',
            title: expect.stringContaining('Commit'),
          }),
        }),
      );
    });

    it('handles contribution.pull_request.ingested event', async () => {
      const contribution = {
        id: 'pr-id',
        title: 'Add activity feed',
        description: 'Implements the activity feed feature',
        contributorId: 'user-1',
        contributionType: 'PULL_REQUEST',
        sourceRef: 'pr/123',
        contributor: { domain: 'Technology' },
        repository: { fullName: 'edin/platform' },
      };

      mockPrisma.contribution.findUnique.mockResolvedValue(contribution);
      mockPrisma.activityEvent.create.mockResolvedValue({
        ...contribution,
        id: 'event-2',
        eventType: 'CONTRIBUTION_NEW',
        entityId: 'pr-id',
        metadata: null,
        createdAt: new Date(),
        contributor: { id: 'user-1', name: 'Bob', avatarUrl: null },
      });

      await service.handlePrIngested({
        contributionId: 'pr-id',
        contributionType: 'PULL_REQUEST',
        contributorId: 'user-1',
        repositoryId: 'repo-1',
        correlationId: 'corr-2',
      });

      expect(mockPrisma.activityEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: expect.stringContaining('Pull Request'),
          }),
        }),
      );
    });

    it('skips unattributed contributions', async () => {
      await service.handleCommitIngested({
        contributionId: 'contrib-id',
        contributionType: 'COMMIT',
        contributorId: null,
        repositoryId: 'repo-1',
        correlationId: 'corr-1',
      });

      expect(mockPrisma.activityEvent.create).not.toHaveBeenCalled();
    });

    it('handles working-group.member.joined event', async () => {
      mockPrisma.workingGroup.findUnique.mockResolvedValue({
        domain: 'Finance',
        name: 'Finance & Financial Engineering',
      });
      mockPrisma.contributor.findUnique.mockResolvedValue({
        name: 'Charlie',
      });
      mockPrisma.activityEvent.create.mockResolvedValue({
        id: 'event-3',
        eventType: 'MEMBER_JOINED',
        title: 'Charlie joined Finance & Financial Engineering',
        description: null,
        contributorId: 'user-2',
        domain: 'Finance',
        contributionType: null,
        entityId: 'wg-1',
        metadata: null,
        createdAt: new Date(),
        contributor: { id: 'user-2', name: 'Charlie', avatarUrl: null },
      });

      await service.handleMemberJoined({
        eventType: 'working-group.member.joined',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-3',
        actorId: 'user-2',
        payload: {
          workingGroupId: 'wg-1',
          contributorId: 'user-2',
          workingGroupName: 'Finance & Financial Engineering',
        },
      });

      expect(mockPrisma.activityEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'MEMBER_JOINED',
            domain: 'Finance',
          }),
        }),
      );
    });

    it('handles working-group.announcement.created event', async () => {
      mockPrisma.workingGroup.findUnique.mockResolvedValue({
        domain: 'Technology',
        name: 'Technology',
      });
      mockPrisma.activityEvent.create.mockResolvedValue({
        id: 'event-4',
        eventType: 'ANNOUNCEMENT_CREATED',
        title: 'New announcement in Technology',
        description: 'Welcome to the team!',
        contributorId: 'lead-1',
        domain: 'Technology',
        contributionType: null,
        entityId: 'ann-1',
        metadata: null,
        createdAt: new Date(),
        contributor: { id: 'lead-1', name: 'Lead', avatarUrl: null },
      });

      await service.handleAnnouncementCreated({
        eventType: 'working-group.announcement.created',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-4',
        actorId: 'lead-1',
        payload: {
          announcementId: 'ann-1',
          workingGroupId: 'wg-tech',
          authorId: 'lead-1',
          content: 'Welcome to the team!',
        },
      });

      expect(mockPrisma.activityEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'ANNOUNCEMENT_CREATED',
          }),
        }),
      );
    });

    it('handles task.status-changed event with COMPLETED status', async () => {
      mockPrisma.activityEvent.create.mockResolvedValue({
        id: 'event-5',
        eventType: 'TASK_COMPLETED',
        title: 'Task completed: Implement API',
        description: null,
        contributorId: 'user-3',
        domain: 'Technology',
        contributionType: null,
        entityId: 'task-1',
        metadata: null,
        createdAt: new Date(),
        contributor: { id: 'user-3', name: 'Dev', avatarUrl: null },
      });

      await service.handleTaskStatusChanged({
        eventType: 'task.status-changed',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-5',
        actorId: 'user-3',
        payload: {
          taskId: 'task-1',
          title: 'Implement API',
          domain: 'Technology',
          oldStatus: 'IN_PROGRESS',
          newStatus: 'COMPLETED',
          contributorId: 'user-3',
        },
      });

      expect(mockPrisma.activityEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'TASK_COMPLETED',
          }),
        }),
      );
    });

    it('handles feedback.review.assigned event', async () => {
      mockPrisma.activityEvent.create.mockResolvedValue({
        id: 'event-6',
        eventType: 'FEEDBACK_ASSIGNED',
        title: 'Peer review assigned for Fix auth bug',
        description: null,
        contributorId: 'reviewer-1',
        domain: 'Technology',
        contributionType: null,
        entityId: 'pf-1',
        metadata: null,
        createdAt: new Date(),
        contributor: { id: 'reviewer-1', name: 'Reviewer', avatarUrl: null },
      });

      await service.handleFeedbackAssigned({
        eventType: 'feedback.review.assigned',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-7',
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

      expect(mockPrisma.activityEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'FEEDBACK_ASSIGNED',
            title: 'Peer review assigned for Fix auth bug',
          }),
        }),
      );
    });

    it('creates FEEDBACK_SUBMITTED activity event on feedback.review.submitted', async () => {
      mockPrisma.activityEvent.create.mockResolvedValue({
        id: 'event-7',
        eventType: 'FEEDBACK_SUBMITTED',
        title: 'Peer feedback submitted for Fix auth bug',
        description: null,
        contributorId: 'reviewer-1',
        domain: 'Technology',
        contributionType: null,
        entityId: 'pf-1',
        metadata: null,
        createdAt: new Date(),
        contributor: { id: 'reviewer-1', name: 'Reviewer', avatarUrl: null },
      });

      await service.handleFeedbackSubmitted({
        eventType: 'feedback.review.submitted',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-8',
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

      expect(mockPrisma.activityEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'FEEDBACK_SUBMITTED',
            title: 'Peer feedback submitted for Fix auth bug',
          }),
        }),
      );
    });

    it('feedback submitted activity event has correct metadata', async () => {
      mockPrisma.activityEvent.create.mockResolvedValue({
        id: 'event-8',
        eventType: 'FEEDBACK_SUBMITTED',
        title: 'Peer feedback submitted for PR #42',
        description: null,
        contributorId: 'reviewer-2',
        domain: 'Finance',
        contributionType: null,
        entityId: 'pf-2',
        metadata: {
          contributionId: 'contrib-2',
          contributionType: 'PULL_REQUEST',
          peerFeedbackId: 'pf-2',
        },
        createdAt: new Date(),
        contributor: { id: 'reviewer-2', name: 'Reviewer 2', avatarUrl: null },
      });

      await service.handleFeedbackSubmitted({
        eventType: 'feedback.review.submitted',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-9',
        actorId: 'reviewer-2',
        payload: {
          peerFeedbackId: 'pf-2',
          contributionId: 'contrib-2',
          reviewerId: 'reviewer-2',
          contributorId: 'author-2',
          contributionTitle: 'PR #42',
          contributionType: 'PULL_REQUEST',
          domain: 'Finance',
        },
      });

      expect(mockPrisma.activityEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              contributionId: 'contrib-2',
              contributionType: 'PULL_REQUEST',
              peerFeedbackId: 'pf-2',
            }),
          }),
        }),
      );
    });

    it('ignores task status changes that are not COMPLETED', async () => {
      await service.handleTaskStatusChanged({
        eventType: 'task.status-changed',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-6',
        actorId: 'user-3',
        payload: {
          taskId: 'task-1',
          title: 'Implement API',
          domain: 'Technology',
          oldStatus: 'AVAILABLE',
          newStatus: 'CLAIMED',
        },
      });

      expect(mockPrisma.activityEvent.create).not.toHaveBeenCalled();
    });

    it('handles sprint.lifecycle.started event', async () => {
      mockPrisma.contributor.findFirst.mockResolvedValue({ id: 'admin-1' });
      mockPrisma.activityEvent.create.mockResolvedValue({
        id: 'event-sprint-1',
        eventType: 'SPRINT_STARTED',
        title: 'Sprint started: Sprint 42',
        description: '20 points committed',
        contributorId: 'admin-1',
        domain: 'Technology',
        contributionType: null,
        entityId: 'sprint-1',
        metadata: { sprintId: 'sprint-1', sprintName: 'Sprint 42', committedPoints: 20 },
        createdAt: new Date(),
        contributor: { id: 'admin-1', name: 'Admin', avatarUrl: null },
      });

      await service.handleSprintStarted({
        eventType: 'sprint.lifecycle.started',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-sprint-1',
        payload: {
          sprintId: 'sprint-1',
          sprintName: 'Sprint 42',
          committedPoints: 20,
        },
      });

      expect(mockPrisma.activityEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'SPRINT_STARTED',
            title: 'Sprint started: Sprint 42',
          }),
        }),
      );
    });

    it('handles sprint.lifecycle.completed event with velocity metadata', async () => {
      mockPrisma.contributor.findFirst.mockResolvedValue({ id: 'admin-1' });
      mockPrisma.activityEvent.create.mockResolvedValue({
        id: 'event-sprint-2',
        eventType: 'SPRINT_COMPLETED',
        title: 'Sprint completed: Sprint 41',
        description: 'Velocity: 18 points (18/20 delivered)',
        contributorId: 'admin-1',
        domain: 'Technology',
        contributionType: null,
        entityId: 'sprint-1',
        metadata: {
          sprintId: 'sprint-1',
          sprintName: 'Sprint 41',
          velocity: 18,
          committedPoints: 20,
          deliveredPoints: 18,
        },
        createdAt: new Date(),
        contributor: { id: 'admin-1', name: 'Admin', avatarUrl: null },
      });

      await service.handleSprintCompleted({
        eventType: 'sprint.lifecycle.completed',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-sprint-2',
        payload: {
          sprintId: 'sprint-1',
          sprintName: 'Sprint 41',
          velocity: 18,
          committedPoints: 20,
          deliveredPoints: 18,
        },
      });

      expect(mockPrisma.activityEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'SPRINT_COMPLETED',
            metadata: expect.objectContaining({
              velocity: 18,
              deliveredPoints: 18,
              committedPoints: 20,
            }),
          }),
        }),
      );
    });

    it('handles sprint.velocity.milestone event', async () => {
      mockPrisma.contributor.findFirst.mockResolvedValue({ id: 'admin-1' });
      mockPrisma.activityEvent.create.mockResolvedValue({
        id: 'event-sprint-3',
        eventType: 'SPRINT_VELOCITY_MILESTONE',
        title: 'Velocity milestone: 75% of sprint goal reached',
        description: 'Sprint 42: 15/20 points delivered',
        contributorId: 'admin-1',
        domain: 'Technology',
        contributionType: null,
        entityId: 'sprint-1',
        metadata: {
          sprintId: 'sprint-1',
          sprintName: 'Sprint 42',
          milestonePercentage: 75,
          velocity: 15,
          committedPoints: 20,
          deliveredPoints: 15,
        },
        createdAt: new Date(),
        contributor: { id: 'admin-1', name: 'Admin', avatarUrl: null },
      });

      await service.handleVelocityMilestone({
        eventType: 'sprint.velocity.milestone',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-sprint-3',
        payload: {
          sprintId: 'sprint-1',
          sprintName: 'Sprint 42',
          milestonePercentage: 75,
          velocity: 15,
          committedPoints: 20,
          deliveredPoints: 15,
        },
      });

      expect(mockPrisma.activityEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'SPRINT_VELOCITY_MILESTONE',
            title: 'Velocity milestone: 75% of sprint goal reached',
          }),
        }),
      );
    });

    it('skips sprint event creation when no admin contributor exists', async () => {
      mockPrisma.contributor.findFirst.mockResolvedValue(null);

      await service.handleSprintStarted({
        eventType: 'sprint.lifecycle.started',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-no-admin',
        payload: {
          sprintId: 'sprint-1',
          sprintName: 'Sprint 42',
        },
      });

      expect(mockPrisma.activityEvent.create).not.toHaveBeenCalled();
    });
  });

  describe('getFeed with excludeEventTypes', () => {
    it('excludes sprint events when excludeEventTypes provided', async () => {
      mockPrisma.activityEvent.findMany.mockResolvedValue([]);
      mockPrisma.activityEvent.count.mockResolvedValue(0);

      await service.getFeed({
        limit: 20,
        excludeEventTypes: ['SPRINT_STARTED', 'SPRINT_COMPLETED', 'SPRINT_VELOCITY_MILESTONE'],
      });

      expect(mockPrisma.activityEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventType: {
              notIn: ['SPRINT_STARTED', 'SPRINT_COMPLETED', 'SPRINT_VELOCITY_MILESTONE'],
            },
          }),
        }),
      );
    });

    it('does not filter when excludeEventTypes is empty', async () => {
      mockPrisma.activityEvent.findMany.mockResolvedValue([]);
      mockPrisma.activityEvent.count.mockResolvedValue(0);

      await service.getFeed({ limit: 20, excludeEventTypes: [] });

      const callArgs = mockPrisma.activityEvent.findMany.mock.calls[0][0];
      expect(callArgs.where.eventType).toBeUndefined();
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ZenhubTaskSyncService } from './zenhub-task-sync.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ZenhubConfigService } from './zenhub-config.service.js';
import type { ZenhubIssueData } from '@edin/shared';

const mockPrisma = {
  task: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  contributor: {
    findUnique: vi.fn(),
  },
  zenhubSync: {
    findUnique: vi.fn(),
  },
  zenhubSyncConflict: {
    create: vi.fn(),
  },
};

const mockConfigService = {
  resolveTaskSyncEnabled: vi.fn(),
  resolveContributorTaskLabel: vi.fn(),
  resolveTaskSyncCreatorId: vi.fn(),
  resolveWorkspaceMapping: vi.fn(),
  resolveStatusSyncEnabled: vi.fn(),
  resolvePipelineStatusMapping: vi.fn(),
};

const mockEventEmitter = {
  emit: vi.fn(),
};

function makeIssue(overrides: Partial<ZenhubIssueData> = {}): ZenhubIssueData {
  return {
    id: 'zh-issue-123',
    number: 42,
    title: 'Implement feature X',
    body: 'Detailed description of feature X',
    estimate: { value: 5 },
    labels: { nodes: [{ name: 'contributor-task' }] },
    assignees: { nodes: [{ login: 'devuser' }] },
    ...overrides,
  };
}

describe('ZenhubTaskSyncService', () => {
  let service: ZenhubTaskSyncService;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default config: enabled, label configured, creator configured
    mockConfigService.resolveTaskSyncEnabled.mockResolvedValue(true);
    mockConfigService.resolveContributorTaskLabel.mockResolvedValue('contributor-task');
    mockConfigService.resolveTaskSyncCreatorId.mockResolvedValue('admin-uuid-123');
    mockConfigService.resolveWorkspaceMapping.mockResolvedValue({ Technology: 'ws-1' });
    mockConfigService.resolveStatusSyncEnabled.mockResolvedValue(true);
    mockConfigService.resolvePipelineStatusMapping.mockResolvedValue({
      Backlog: 'AVAILABLE',
      'Sprint Backlog': 'AVAILABLE',
      'In Progress': 'IN_PROGRESS',
      'In Review': 'IN_PROGRESS',
      Done: 'COMPLETED',
    });

    // Default: no existing task
    mockPrisma.task.findUnique.mockResolvedValue(null);

    // Default: task creation succeeds
    mockPrisma.task.create.mockResolvedValue({
      id: 'new-task-uuid',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Default: no contributor match for assignee
    mockPrisma.contributor.findUnique.mockResolvedValue(null);

    // Default: conflict creation succeeds
    mockPrisma.zenhubSyncConflict.create.mockResolvedValue({
      id: 'conflict-uuid-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const module = await Test.createTestingModule({
      providers: [
        ZenhubTaskSyncService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ZenhubConfigService, useValue: mockConfigService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get(ZenhubTaskSyncService);
  });

  describe('syncTaskFromIssue', () => {
    it('creates a task from a labeled Zenhub issue with correct field mapping', async () => {
      const issue = makeIssue();

      const taskId = await service.syncTaskFromIssue(issue, 'Technology', 'corr-1');

      expect(taskId).toBe('new-task-uuid');
      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: {
          title: 'Implement feature X',
          description: 'Detailed description of feature X',
          domain: 'Technology',
          difficulty: 'INTERMEDIATE',
          estimatedEffort: '5 story points',
          status: 'AVAILABLE',
          zenhubIssueId: 'zh-issue-123',
          createdById: 'admin-uuid-123',
        },
      });

      // Should emit both zenhub.task.created and task.created events
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'zenhub.task.created',
        expect.objectContaining({
          eventType: 'zenhub.task.created',
          payload: expect.objectContaining({
            taskId: 'new-task-uuid',
            zenhubIssueId: 'zh-issue-123',
            issueNumber: 42,
          }),
        }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'task.created',
        expect.objectContaining({
          eventType: 'task.created',
        }),
      );
    });

    it('skips task creation when task already exists for the Zenhub issue (idempotent)', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({ id: 'existing-task-uuid' });

      const taskId = await service.syncTaskFromIssue(makeIssue(), 'Technology', 'corr-2');

      expect(taskId).toBeNull();
      expect(mockPrisma.task.create).not.toHaveBeenCalled();
    });

    it('skips task creation when task sync creator ID is not configured', async () => {
      mockConfigService.resolveTaskSyncCreatorId.mockResolvedValue(null);

      const taskId = await service.syncTaskFromIssue(makeIssue(), 'Technology', 'corr-3');

      expect(taskId).toBeNull();
      expect(mockPrisma.task.create).not.toHaveBeenCalled();
    });

    it('auto-claims task when assignee matches a contributor githubUsername', async () => {
      const contributorId = 'contrib-uuid-456';
      mockPrisma.contributor.findUnique.mockResolvedValue({ id: contributorId });

      await service.syncTaskFromIssue(makeIssue(), 'Technology', 'corr-4');

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'new-task-uuid' },
        data: expect.objectContaining({
          status: 'CLAIMED',
          claimedById: contributorId,
        }),
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'task.claimed',
        expect.objectContaining({
          eventType: 'task.claimed',
          payload: expect.objectContaining({ contributorId }),
        }),
      );
    });

    it('handles missing description gracefully by using title as fallback', async () => {
      const issue = makeIssue({ body: undefined });

      await service.syncTaskFromIssue(issue, 'Technology', 'corr-5');

      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: 'Implement feature X',
        }),
      });
    });

    it('handles empty body by using title as fallback', async () => {
      const issue = makeIssue({ body: '   ' });

      await service.syncTaskFromIssue(issue, 'Technology', 'corr-5b');

      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: 'Implement feature X',
        }),
      });
    });

    it('sets estimatedEffort to "Unestimated" when issue has no estimate', async () => {
      const issue = makeIssue({ estimate: null });

      await service.syncTaskFromIssue(issue, 'Technology', 'corr-6');

      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          estimatedEffort: 'Unestimated',
        }),
      });
    });

    it('handles P2002 unique constraint error gracefully (race condition)', async () => {
      const p2002Error = new Error('Unique constraint violation');
      Object.assign(p2002Error, { code: 'P2002' });
      mockPrisma.task.create.mockRejectedValue(p2002Error);

      const taskId = await service.syncTaskFromIssue(makeIssue(), 'Technology', 'corr-7');

      expect(taskId).toBeNull();
    });

    it('maps "default" workspace domain to Technology', async () => {
      await service.syncTaskFromIssue(makeIssue(), 'default', 'corr-8');

      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          domain: 'Technology',
        }),
      });
    });

    it('maps workspace domain case-insensitively', async () => {
      await service.syncTaskFromIssue(makeIssue(), 'finance', 'corr-9');

      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          domain: 'Finance',
        }),
      });
    });
  });

  describe('processPolledIssues', () => {
    it('creates tasks only for issues with the configured label', async () => {
      const labeled = makeIssue({ id: 'issue-1', number: 1 });
      const unlabeled = makeIssue({
        id: 'issue-2',
        number: 2,
        labels: { nodes: [{ name: 'bug' }] },
      });
      const noLabels = makeIssue({
        id: 'issue-3',
        number: 3,
        labels: { nodes: [] },
      });

      const result = await service.processPolledIssues(
        [labeled, unlabeled, noLabels],
        'Technology',
        'corr-10',
      );

      expect(result.created).toBe(1);
      expect(result.skipped).toBe(2);
      expect(mockPrisma.task.create).toHaveBeenCalledTimes(1);
    });

    it('returns skipped counts when task sync is disabled', async () => {
      mockConfigService.resolveTaskSyncEnabled.mockResolvedValue(false);

      const result = await service.processPolledIssues([makeIssue()], 'Technology', 'corr-11');

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
      expect(mockPrisma.task.create).not.toHaveBeenCalled();
    });

    it('returns skipped counts when no contributor task label configured', async () => {
      mockConfigService.resolveContributorTaskLabel.mockResolvedValue(null);

      const result = await service.processPolledIssues([makeIssue()], 'Technology', 'corr-12');

      expect(result.created).toBe(0);
      expect(result.skipped).toBe(1);
    });
  });

  describe('handleWebhookEvent', () => {
    it('processes labeled issue from webhook payload', async () => {
      const webhookPayload = {
        issue: {
          id: 'zh-webhook-issue',
          number: 99,
          title: 'Webhook task',
          body: 'From webhook',
          labels: { nodes: [{ name: 'contributor-task' }] },
          assignees: { nodes: [] },
        },
        workspace_id: 'ws-1',
      };

      mockPrisma.zenhubSync.findUnique.mockResolvedValue({
        payload: webhookPayload,
        eventType: 'issue_transfer',
      });

      await service.handleWebhookEvent({
        eventType: 'zenhub.webhook.received',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-13',
        payload: {
          syncId: 'sync-uuid-1',
          webhookEventType: 'issue_transfer',
          deliveryId: 'del-1',
        },
      });

      expect(mockPrisma.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Webhook task',
          zenhubIssueId: 'zh-webhook-issue',
        }),
      });
    });

    it('skips task creation when task sync is disabled but still processes status sync', async () => {
      mockConfigService.resolveTaskSyncEnabled.mockResolvedValue(false);

      mockPrisma.zenhubSync.findUnique.mockResolvedValue({
        payload: {
          issue: {
            id: 'zh-webhook-issue',
            number: 99,
            title: 'Webhook task',
            labels: { nodes: [{ name: 'contributor-task' }] },
            assignees: { nodes: [] },
          },
          to_pipeline: { name: 'In Progress', id: 'pipe-2' },
          workspace_id: 'ws-1',
        },
        eventType: 'issue_transfer',
      });

      // No linked task exists
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await service.handleWebhookEvent({
        eventType: 'zenhub.webhook.received',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-14',
        payload: {
          syncId: 'sync-uuid-2',
          webhookEventType: 'issue_transfer',
          deliveryId: 'del-2',
        },
      });

      // Sync record IS loaded (status sync runs independently)
      expect(mockPrisma.zenhubSync.findUnique).toHaveBeenCalled();
      // Task creation should NOT happen (task sync disabled)
      expect(mockPrisma.task.create).not.toHaveBeenCalled();
    });

    it('skips when webhook payload has no issue data', async () => {
      mockPrisma.zenhubSync.findUnique.mockResolvedValue({
        payload: { some: 'unrelated data' },
        eventType: 'sprint_start',
      });

      await service.handleWebhookEvent({
        eventType: 'zenhub.webhook.received',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-15',
        payload: {
          syncId: 'sync-uuid-3',
          webhookEventType: 'sprint_start',
          deliveryId: 'del-3',
        },
      });

      expect(mockPrisma.task.create).not.toHaveBeenCalled();
    });

    it('triggers status sync for issue_transfer webhook events', async () => {
      mockPrisma.zenhubSync.findUnique.mockResolvedValue({
        payload: {
          issue: {
            id: 'zh-linked-issue',
            number: 50,
            title: 'Linked task',
          },
          to_pipeline: { name: 'In Progress', id: 'pipe-2' },
          workspace_id: 'ws-1',
        },
        eventType: 'issue_transfer',
      });

      // Linked task exists
      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-linked',
        status: 'AVAILABLE',
        estimatedEffort: '5 story points',
      });

      mockPrisma.task.update.mockResolvedValue({});

      await service.handleWebhookEvent({
        eventType: 'zenhub.webhook.received',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-wh-status',
        payload: {
          syncId: 'sync-uuid-wh',
          webhookEventType: 'issue_transfer',
          deliveryId: 'del-wh',
        },
      });

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-linked' },
        data: { status: 'IN_PROGRESS' },
      });
    });

    it('triggers estimate sync for estimate_set webhook events', async () => {
      mockPrisma.zenhubSync.findUnique.mockResolvedValue({
        payload: {
          issue: {
            id: 'zh-est-issue',
            number: 60,
            title: 'Estimate change',
          },
          estimate: { value: 13 },
          workspace_id: 'ws-1',
        },
        eventType: 'estimate_set',
      });

      // Linked task exists
      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-est',
        estimatedEffort: '5 story points',
      });

      mockPrisma.task.update.mockResolvedValue({});

      await service.handleWebhookEvent({
        eventType: 'zenhub.webhook.received',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-wh-est',
        payload: {
          syncId: 'sync-uuid-est',
          webhookEventType: 'estimate_set',
          deliveryId: 'del-est',
        },
      });

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-est' },
        data: { estimatedEffort: '13 story points' },
      });
    });
  });

  describe('syncStatusFromIssue', () => {
    it('syncs status when pipeline maps to a different TaskStatus', async () => {
      const issue = makeIssue({
        pipelineIssue: { pipeline: { id: 'pipe-1', name: 'In Progress' } },
      });

      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        status: 'AVAILABLE',
        estimatedEffort: '5 story points',
      });

      mockPrisma.task.update.mockResolvedValue({});

      const result = await service.syncStatusFromIssue(issue, 'corr-s1');

      expect(result.updated).toBe(true);
      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { status: 'IN_PROGRESS' },
      });
    });

    it('skips status update when task already has the mapped status (idempotent)', async () => {
      const issue = makeIssue({
        pipelineIssue: { pipeline: { id: 'pipe-1', name: 'In Progress' } },
      });

      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        status: 'IN_PROGRESS',
        estimatedEffort: '5 story points',
      });

      const result = await service.syncStatusFromIssue(issue, 'corr-s2');

      expect(result.updated).toBe(false);
      expect(mockPrisma.task.update).not.toHaveBeenCalled();
    });

    it('skips status update when status sync is disabled', async () => {
      mockConfigService.resolveStatusSyncEnabled.mockResolvedValue(false);

      const issue = makeIssue({
        pipelineIssue: { pipeline: { id: 'pipe-1', name: 'Done' } },
      });

      const result = await service.syncStatusFromIssue(issue, 'corr-s3');

      expect(result.updated).toBe(false);
      expect(mockPrisma.task.findUnique).not.toHaveBeenCalled();
    });

    it('logs warning and skips when pipeline name has no mapping', async () => {
      const issue = makeIssue({
        pipelineIssue: { pipeline: { id: 'pipe-1', name: 'QA Testing' } },
      });

      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        status: 'AVAILABLE',
        estimatedEffort: '5 story points',
      });

      const result = await service.syncStatusFromIssue(issue, 'corr-s4');

      expect(result.updated).toBe(false);
      expect(mockPrisma.task.update).not.toHaveBeenCalled();
    });

    it('skips when no linked task exists', async () => {
      const issue = makeIssue({
        pipelineIssue: { pipeline: { id: 'pipe-1', name: 'Done' } },
      });

      mockPrisma.task.findUnique.mockResolvedValue(null);

      const result = await service.syncStatusFromIssue(issue, 'corr-s5');

      expect(result.updated).toBe(false);
      expect(mockPrisma.task.update).not.toHaveBeenCalled();
    });

    it('sets completedAt when mapping to COMPLETED', async () => {
      const issue = makeIssue({
        pipelineIssue: { pipeline: { id: 'pipe-1', name: 'Done' } },
      });

      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        status: 'IN_PROGRESS',
        estimatedEffort: '5 story points',
      });

      mockPrisma.task.update.mockResolvedValue({});

      await service.syncStatusFromIssue(issue, 'corr-s6');

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: {
          status: 'COMPLETED',
          completedAt: expect.any(Date),
        },
      });
    });

    it('clears completedAt when mapping away from COMPLETED', async () => {
      const issue = makeIssue({
        pipelineIssue: { pipeline: { id: 'pipe-1', name: 'In Progress' } },
      });

      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        status: 'COMPLETED',
        estimatedEffort: '5 story points',
      });

      mockPrisma.task.update.mockResolvedValue({});

      await service.syncStatusFromIssue(issue, 'corr-s7');

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: {
          status: 'IN_PROGRESS',
          completedAt: null,
        },
      });
    });

    it('emits both task.status-changed and zenhub.task.status.synced events', async () => {
      const issue = makeIssue({
        pipelineIssue: { pipeline: { id: 'pipe-1', name: 'Done' } },
      });

      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        status: 'IN_PROGRESS',
        estimatedEffort: '5 story points',
      });

      mockPrisma.task.update.mockResolvedValue({});

      await service.syncStatusFromIssue(issue, 'corr-s8');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'task.status-changed',
        expect.objectContaining({
          eventType: 'task.status-changed',
          payload: expect.objectContaining({
            taskId: 'task-1',
            previousStatus: 'IN_PROGRESS',
            newStatus: 'COMPLETED',
          }),
        }),
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'zenhub.task.status.synced',
        expect.objectContaining({
          eventType: 'zenhub.task.status.synced',
          payload: expect.objectContaining({
            taskId: 'task-1',
            zenhubIssueId: 'zh-issue-123',
            pipelineName: 'Done',
          }),
        }),
      );
    });

    it('skips update for tasks in EVALUATED terminal status', async () => {
      const issue = makeIssue({
        pipelineIssue: { pipeline: { id: 'pipe-1', name: 'Done' } },
      });

      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        status: 'EVALUATED',
        estimatedEffort: '5 story points',
      });

      const result = await service.syncStatusFromIssue(issue, 'corr-s9');

      expect(result.updated).toBe(false);
      expect(mockPrisma.task.update).not.toHaveBeenCalled();
    });

    it('skips when issue has no pipeline data', async () => {
      const issue = makeIssue({ pipelineIssue: null });

      const result = await service.syncStatusFromIssue(issue, 'corr-s10');

      expect(result.updated).toBe(false);
    });
  });

  describe('syncEstimateFromIssue', () => {
    it('syncs story points to estimatedEffort string', async () => {
      const issue = makeIssue({ estimate: { value: 8 } });

      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        estimatedEffort: '5 story points',
      });

      mockPrisma.task.update.mockResolvedValue({});

      const result = await service.syncEstimateFromIssue(issue, 'corr-e1');

      expect(result.updated).toBe(true);
      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { estimatedEffort: '8 story points' },
      });
    });

    it('handles cleared estimates (null) by setting Unestimated', async () => {
      const issue = makeIssue({ estimate: null });

      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        estimatedEffort: '5 story points',
      });

      mockPrisma.task.update.mockResolvedValue({});

      const result = await service.syncEstimateFromIssue(issue, 'corr-e2');

      expect(result.updated).toBe(true);
      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { estimatedEffort: 'Unestimated' },
      });
    });

    it('skips estimate update when already matching (idempotent)', async () => {
      const issue = makeIssue({ estimate: { value: 5 } });

      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        estimatedEffort: '5 story points',
      });

      const result = await service.syncEstimateFromIssue(issue, 'corr-e3');

      expect(result.updated).toBe(false);
      expect(mockPrisma.task.update).not.toHaveBeenCalled();
    });

    it('skips when no linked task exists', async () => {
      const issue = makeIssue({ estimate: { value: 8 } });
      mockPrisma.task.findUnique.mockResolvedValue(null);

      const result = await service.syncEstimateFromIssue(issue, 'corr-e4');

      expect(result.updated).toBe(false);
    });

    it('skips when task sync is disabled', async () => {
      mockConfigService.resolveTaskSyncEnabled.mockResolvedValue(false);

      const issue = makeIssue({ estimate: { value: 8 } });

      const result = await service.syncEstimateFromIssue(issue, 'corr-e5');

      expect(result.updated).toBe(false);
      expect(mockPrisma.task.findUnique).not.toHaveBeenCalled();
    });

    it('emits zenhub.task.points.synced event', async () => {
      const issue = makeIssue({ estimate: { value: 13 } });

      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        estimatedEffort: '5 story points',
      });

      mockPrisma.task.update.mockResolvedValue({});

      await service.syncEstimateFromIssue(issue, 'corr-e6');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'zenhub.task.points.synced',
        expect.objectContaining({
          eventType: 'zenhub.task.points.synced',
          payload: expect.objectContaining({
            taskId: 'task-1',
            zenhubIssueId: 'zh-issue-123',
            previousEstimate: '5 story points',
            newEstimate: '13 story points',
            storyPoints: 13,
          }),
        }),
      );
    });
  });

  describe('syncExistingTasksFromPolledIssues', () => {
    it('syncs status and estimates for multiple linked tasks', async () => {
      const issue1 = makeIssue({
        id: 'issue-1',
        pipelineIssue: { pipeline: { id: 'p1', name: 'In Progress' } },
        estimate: { value: 8 },
      });
      const issue2 = makeIssue({
        id: 'issue-2',
        pipelineIssue: { pipeline: { id: 'p2', name: 'Done' } },
        estimate: { value: 3 },
      });

      // First issue: linked task exists, status differs
      mockPrisma.task.findUnique
        .mockResolvedValueOnce({
          id: 'task-1',
          status: 'AVAILABLE',
          estimatedEffort: '5 story points',
        }) // status check
        .mockResolvedValueOnce({ id: 'task-1', estimatedEffort: '5 story points' }) // estimate check
        .mockResolvedValueOnce({
          id: 'task-2',
          status: 'IN_PROGRESS',
          estimatedEffort: '3 story points',
        }) // status check
        .mockResolvedValueOnce({ id: 'task-2', estimatedEffort: '3 story points' }); // estimate check

      mockPrisma.task.update.mockResolvedValue({});

      const result = await service.syncExistingTasksFromPolledIssues(
        [issue1, issue2],
        'corr-batch',
      );

      expect(result.statusUpdated).toBe(2);
      expect(result.estimateUpdated).toBe(1); // issue1 changes from 5 to 8
    });
  });

  describe('conflict detection (zh-5-3)', () => {
    it('creates auto-resolved conflict record when status diverges', async () => {
      const issue = makeIssue({
        pipelineIssue: { pipeline: { id: 'pipe-1', name: 'In Progress' } },
      });

      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        status: 'AVAILABLE',
        estimatedEffort: '5 story points',
      });

      mockPrisma.task.update.mockResolvedValue({});

      await service.syncStatusFromIssue(issue, 'corr-c1');

      expect(mockPrisma.zenhubSyncConflict.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          conflictType: 'SPRINT_SYNC_CONFLICT',
          affectedEntity: 'Task',
          affectedEntityId: 'task-1',
          resolution: 'auto-resolved',
          occurredAt: expect.any(Date),
        }),
      });
    });

    it('stores correct Edin/Zenhub states in conflict outcome JSON', async () => {
      const issue = makeIssue({
        pipelineIssue: { pipeline: { id: 'pipe-1', name: 'Done' } },
      });

      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        status: 'IN_PROGRESS',
        estimatedEffort: '5 story points',
      });

      mockPrisma.task.update.mockResolvedValue({});

      await service.syncStatusFromIssue(issue, 'corr-c2');

      const callArgs = mockPrisma.zenhubSyncConflict.create.mock.calls[0][0];
      const outcome = JSON.parse(callArgs.data.outcome);

      expect(outcome).toEqual({
        edinStatus: 'IN_PROGRESS',
        zenhubPipeline: 'Done',
        zenhubMappedStatus: 'COMPLETED',
        appliedStatus: 'COMPLETED',
        taskId: 'task-1',
        zenhubIssueId: 'zh-issue-123',
      });
    });

    it('emits sprint.sync.conflict event on status divergence', async () => {
      const issue = makeIssue({
        pipelineIssue: { pipeline: { id: 'pipe-1', name: 'In Progress' } },
      });

      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        status: 'AVAILABLE',
        estimatedEffort: '5 story points',
      });

      mockPrisma.task.update.mockResolvedValue({});

      await service.syncStatusFromIssue(issue, 'corr-c3');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'sprint.sync.conflict',
        expect.objectContaining({
          eventType: 'sprint.sync.conflict',
          correlationId: 'corr-c3',
          payload: expect.objectContaining({
            conflictId: 'conflict-uuid-1',
            conflictType: 'SPRINT_SYNC_CONFLICT',
            resolution: 'auto-resolved',
            taskId: 'task-1',
          }),
        }),
      );
    });

    it('creates pending conflict record for unmapped pipeline', async () => {
      const issue = makeIssue({
        pipelineIssue: { pipeline: { id: 'pipe-1', name: 'QA Testing' } },
      });

      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        status: 'AVAILABLE',
        estimatedEffort: '5 story points',
      });

      await service.syncStatusFromIssue(issue, 'corr-c4');

      expect(mockPrisma.zenhubSyncConflict.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          conflictType: 'SPRINT_SYNC_CONFLICT',
          affectedEntityId: 'task-1',
          resolution: 'pending',
        }),
      });

      const callArgs = mockPrisma.zenhubSyncConflict.create.mock.calls[0][0];
      const outcome = JSON.parse(callArgs.data.outcome);

      expect(outcome).toEqual({
        edinStatus: 'AVAILABLE',
        zenhubPipeline: 'QA Testing',
        zenhubMappedStatus: null,
        appliedStatus: null,
        taskId: 'task-1',
        zenhubIssueId: 'zh-issue-123',
      });
    });

    it('emits sprint.sync.conflict event for unmapped pipeline', async () => {
      const issue = makeIssue({
        pipelineIssue: { pipeline: { id: 'pipe-1', name: 'QA Testing' } },
      });

      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        status: 'AVAILABLE',
        estimatedEffort: '5 story points',
      });

      await service.syncStatusFromIssue(issue, 'corr-c5');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'sprint.sync.conflict',
        expect.objectContaining({
          eventType: 'sprint.sync.conflict',
          payload: expect.objectContaining({
            resolution: 'pending',
            taskId: 'task-1',
          }),
        }),
      );
    });

    it('does NOT create conflict for terminal status tasks', async () => {
      const issue = makeIssue({
        pipelineIssue: { pipeline: { id: 'pipe-1', name: 'Done' } },
      });

      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        status: 'EVALUATED',
        estimatedEffort: '5 story points',
      });

      await service.syncStatusFromIssue(issue, 'corr-c6');

      expect(mockPrisma.zenhubSyncConflict.create).not.toHaveBeenCalled();
    });

    it('does NOT create conflict for idempotent sync (same status)', async () => {
      const issue = makeIssue({
        pipelineIssue: { pipeline: { id: 'pipe-1', name: 'In Progress' } },
      });

      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        status: 'IN_PROGRESS',
        estimatedEffort: '5 story points',
      });

      await service.syncStatusFromIssue(issue, 'corr-c7');

      expect(mockPrisma.zenhubSyncConflict.create).not.toHaveBeenCalled();
    });

    it('still updates task status even if conflict logging fails', async () => {
      const issue = makeIssue({
        pipelineIssue: { pipeline: { id: 'pipe-1', name: 'In Progress' } },
      });

      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-1',
        status: 'AVAILABLE',
        estimatedEffort: '5 story points',
      });

      mockPrisma.zenhubSyncConflict.create.mockRejectedValue(new Error('DB error'));
      mockPrisma.task.update.mockResolvedValue({});

      const result = await service.syncStatusFromIssue(issue, 'corr-c8');

      expect(result.updated).toBe(true);
      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { status: 'IN_PROGRESS' },
      });
    });
  });
});

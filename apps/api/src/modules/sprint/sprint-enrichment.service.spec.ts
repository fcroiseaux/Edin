import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SprintEnrichmentService } from './sprint-enrichment.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ZenhubPollCompletedEvent } from '@edin/shared';

const CONTRIBUTION_ID = 'contrib-uuid-1';
const SPRINT_ID = 'zenhub-sprint-123';
const ZENHUB_ISSUE_ID = 'zh-issue-456';
const CONTEXT_ID = 'context-uuid-1';

const mockContribution = {
  id: CONTRIBUTION_ID,
  contributorId: 'contributor-uuid-1',
  sourceRef: 'pull/42',
  contributionType: 'PULL_REQUEST',
  title: 'Fix #42 improve auth flow',
};

const mockContext = {
  id: CONTEXT_ID,
  contributionId: CONTRIBUTION_ID,
  sprintId: SPRINT_ID,
  storyPoints: 5,
  zenhubIssueId: ZENHUB_ISSUE_ID,
  epicId: 'epic-1',
  pipelineStatus: 'Done',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  contribution: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  contributionSprintContext: {
    upsert: vi.fn(),
    findMany: vi.fn(),
  },
  zenhubSync: {
    findUnique: vi.fn(),
  },
};

const mockEventEmitter = {
  emit: vi.fn(),
};

describe('SprintEnrichmentService', () => {
  let service: SprintEnrichmentService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        SprintEnrichmentService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get(SprintEnrichmentService);
  });

  describe('enrichContribution', () => {
    it('should create enrichment context when contribution exists', async () => {
      mockPrisma.contribution.findUnique.mockResolvedValue(mockContribution);
      mockPrisma.contributionSprintContext.upsert.mockResolvedValue(mockContext);

      const result = await service.enrichContribution({
        contributionId: CONTRIBUTION_ID,
        sprintId: SPRINT_ID,
        storyPoints: 5,
        zenhubIssueId: ZENHUB_ISSUE_ID,
        epicId: 'epic-1',
        pipelineStatus: 'Done',
        correlationId: 'corr-1',
      });

      expect(result).toEqual(mockContext);
      expect(mockPrisma.contribution.findUnique).toHaveBeenCalledWith({
        where: { id: CONTRIBUTION_ID },
      });
      expect(mockPrisma.contributionSprintContext.upsert).toHaveBeenCalledWith({
        where: {
          contributionId_sprintId: {
            contributionId: CONTRIBUTION_ID,
            sprintId: SPRINT_ID,
          },
        },
        update: {
          storyPoints: 5,
          zenhubIssueId: ZENHUB_ISSUE_ID,
          epicId: 'epic-1',
          pipelineStatus: 'Done',
        },
        create: {
          contributionId: CONTRIBUTION_ID,
          sprintId: SPRINT_ID,
          storyPoints: 5,
          zenhubIssueId: ZENHUB_ISSUE_ID,
          epicId: 'epic-1',
          pipelineStatus: 'Done',
        },
      });
    });

    it('should use upsert on duplicate — does not create duplicates (AC4)', async () => {
      mockPrisma.contribution.findUnique.mockResolvedValue(mockContribution);
      const updatedContext = { ...mockContext, storyPoints: 8 };
      mockPrisma.contributionSprintContext.upsert.mockResolvedValue(updatedContext);

      const result = await service.enrichContribution({
        contributionId: CONTRIBUTION_ID,
        sprintId: SPRINT_ID,
        storyPoints: 8,
        zenhubIssueId: ZENHUB_ISSUE_ID,
        pipelineStatus: 'Done',
      });

      expect(result).toEqual(updatedContext);
      expect(result!.storyPoints).toBe(8);
      expect(mockPrisma.contributionSprintContext.upsert).toHaveBeenCalledTimes(1);
    });

    it('should return null when contribution not found (AC5)', async () => {
      mockPrisma.contribution.findUnique.mockResolvedValue(null);

      const result = await service.enrichContribution({
        contributionId: 'non-existent-id',
        sprintId: SPRINT_ID,
        zenhubIssueId: ZENHUB_ISSUE_ID,
      });

      expect(result).toBeNull();
      expect(mockPrisma.contributionSprintContext.upsert).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should emit sprint.contribution.enriched event on success', async () => {
      mockPrisma.contribution.findUnique.mockResolvedValue(mockContribution);
      mockPrisma.contributionSprintContext.upsert.mockResolvedValue(mockContext);

      await service.enrichContribution({
        contributionId: CONTRIBUTION_ID,
        sprintId: SPRINT_ID,
        storyPoints: 5,
        zenhubIssueId: ZENHUB_ISSUE_ID,
        epicId: 'epic-1',
        pipelineStatus: 'Done',
        correlationId: 'corr-1',
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'sprint.contribution.enriched',
        expect.objectContaining({
          eventType: 'sprint.contribution.enriched',
          correlationId: 'corr-1',
          payload: {
            contributionId: CONTRIBUTION_ID,
            sprintId: SPRINT_ID,
            zenhubIssueId: ZENHUB_ISSUE_ID,
            storyPoints: 5,
            epicId: 'epic-1',
            pipelineStatus: 'Done',
          },
        }),
      );
    });

    it('should handle optional fields with null defaults', async () => {
      mockPrisma.contribution.findUnique.mockResolvedValue(mockContribution);
      const contextNoOptionals = {
        ...mockContext,
        storyPoints: null,
        epicId: null,
        pipelineStatus: null,
      };
      mockPrisma.contributionSprintContext.upsert.mockResolvedValue(contextNoOptionals);

      await service.enrichContribution({
        contributionId: CONTRIBUTION_ID,
        sprintId: SPRINT_ID,
        zenhubIssueId: ZENHUB_ISSUE_ID,
      });

      expect(mockPrisma.contributionSprintContext.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            storyPoints: null,
            epicId: null,
            pipelineStatus: null,
          }),
        }),
      );
    });
  });

  describe('enrichSprintContributions', () => {
    it('should process batch and return enriched/skipped counts', async () => {
      // Issue #42 matches a contribution; issue #99 does not
      mockPrisma.contribution.findMany
        .mockResolvedValueOnce([{ id: CONTRIBUTION_ID }]) // issue #42
        .mockResolvedValueOnce([]); // issue #99
      mockPrisma.contribution.findUnique.mockResolvedValue(mockContribution);
      mockPrisma.contributionSprintContext.upsert.mockResolvedValue(mockContext);

      const result = await service.enrichSprintContributions({
        sprintId: SPRINT_ID,
        issues: [
          {
            zenhubIssueId: ZENHUB_ISSUE_ID,
            issueNumber: 42,
            storyPoints: 5,
            pipelineStatus: 'Done',
          },
          {
            zenhubIssueId: 'zh-issue-99',
            issueNumber: 99,
          },
        ],
        correlationId: 'corr-batch',
      });

      expect(result.enriched).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('should handle empty issues array gracefully', async () => {
      const result = await service.enrichSprintContributions({
        sprintId: SPRINT_ID,
        issues: [],
        correlationId: 'corr-empty',
      });

      expect(result.enriched).toBe(0);
      expect(result.skipped).toBe(0);
    });

    it('should skip and continue on error for individual issues', async () => {
      mockPrisma.contribution.findMany
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValueOnce([{ id: CONTRIBUTION_ID }]);
      mockPrisma.contribution.findUnique.mockResolvedValue(mockContribution);
      mockPrisma.contributionSprintContext.upsert.mockResolvedValue(mockContext);

      const result = await service.enrichSprintContributions({
        sprintId: SPRINT_ID,
        issues: [
          { zenhubIssueId: 'zh-1', issueNumber: 1 },
          { zenhubIssueId: 'zh-2', issueNumber: 2, storyPoints: 3 },
        ],
      });

      expect(result.enriched).toBe(1);
      expect(result.skipped).toBe(1);
    });
  });

  describe('handlePollCompleted', () => {
    it('should trigger enrichment from poll data', async () => {
      const pollEvent: ZenhubPollCompletedEvent = {
        eventType: 'zenhub.poll.completed',
        timestamp: new Date().toISOString(),
        correlationId: 'poll-corr-1',
        payload: {
          syncId: 'sync-uuid-1',
          sprintCount: 1,
          issueCount: 2,
          durationMs: 500,
        },
      };

      mockPrisma.zenhubSync.findUnique.mockResolvedValue({
        id: 'sync-uuid-1',
        payload: {
          sprints: [
            { id: SPRINT_ID, name: 'Sprint 10', startAt: '2026-03-01', endAt: '2026-03-14' },
          ],
          issues: [
            {
              id: ZENHUB_ISSUE_ID,
              number: 42,
              estimate: { value: 5 },
              pipelineIssue: { pipeline: { name: 'Done' } },
              sprints: { nodes: [{ id: SPRINT_ID, name: 'Sprint 10' }] },
            },
          ],
        },
      });

      // enrichSprintContributions will be called — mock its dependencies
      mockPrisma.contribution.findMany.mockResolvedValue([{ id: CONTRIBUTION_ID }]);
      mockPrisma.contribution.findUnique.mockResolvedValue(mockContribution);
      mockPrisma.contributionSprintContext.upsert.mockResolvedValue(mockContext);

      await service.handlePollCompleted(pollEvent);

      expect(mockPrisma.zenhubSync.findUnique).toHaveBeenCalledWith({
        where: { id: 'sync-uuid-1' },
      });
      // Should have attempted to find and enrich contributions
      expect(mockPrisma.contribution.findMany).toHaveBeenCalled();
    });

    it('should skip when sync record has no payload', async () => {
      const pollEvent: ZenhubPollCompletedEvent = {
        eventType: 'zenhub.poll.completed',
        timestamp: new Date().toISOString(),
        correlationId: 'poll-corr-2',
        payload: {
          syncId: 'sync-uuid-2',
          sprintCount: 0,
          issueCount: 0,
          durationMs: 100,
        },
      };

      mockPrisma.zenhubSync.findUnique.mockResolvedValue({
        id: 'sync-uuid-2',
        payload: null,
      });

      await service.handlePollCompleted(pollEvent);

      expect(mockPrisma.contribution.findMany).not.toHaveBeenCalled();
    });

    it('should handle issues with no sprint context gracefully', async () => {
      const pollEvent: ZenhubPollCompletedEvent = {
        eventType: 'zenhub.poll.completed',
        timestamp: new Date().toISOString(),
        correlationId: 'poll-corr-3',
        payload: {
          syncId: 'sync-uuid-3',
          sprintCount: 1,
          issueCount: 1,
          durationMs: 200,
        },
      };

      mockPrisma.zenhubSync.findUnique.mockResolvedValue({
        id: 'sync-uuid-3',
        payload: {
          sprints: [],
          issues: [
            {
              id: 'zh-issue-no-sprint',
              number: 50,
              estimate: null,
              pipelineIssue: null,
              sprints: { nodes: [] },
            },
          ],
        },
      });

      await service.handlePollCompleted(pollEvent);

      // No contributions should be searched since issue has no sprints
      expect(mockPrisma.contribution.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getContributionSprintContexts', () => {
    it('should return contexts for a contribution', async () => {
      mockPrisma.contributionSprintContext.findMany.mockResolvedValue([mockContext]);

      const result = await service.getContributionSprintContexts(CONTRIBUTION_ID);

      expect(result).toHaveLength(1);
      expect(result[0].contributionId).toBe(CONTRIBUTION_ID);
      expect(result[0].sprintId).toBe(SPRINT_ID);
      expect(result[0].storyPoints).toBe(5);
      expect(mockPrisma.contributionSprintContext.findMany).toHaveBeenCalledWith({
        where: { contributionId: CONTRIBUTION_ID },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no contexts exist', async () => {
      mockPrisma.contributionSprintContext.findMany.mockResolvedValue([]);

      const result = await service.getContributionSprintContexts('no-enrichment-id');

      expect(result).toHaveLength(0);
    });
  });

  describe('getSprintContributions', () => {
    it('should return all contexts for a sprint', async () => {
      const secondContext = {
        ...mockContext,
        id: 'context-uuid-2',
        contributionId: 'contrib-uuid-2',
      };
      mockPrisma.contributionSprintContext.findMany.mockResolvedValue([mockContext, secondContext]);

      const result = await service.getSprintContributions(SPRINT_ID);

      expect(result).toHaveLength(2);
      expect(mockPrisma.contributionSprintContext.findMany).toHaveBeenCalledWith({
        where: { sprintId: SPRINT_ID },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});

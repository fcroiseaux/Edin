import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SprintMetricsService } from './sprint-metrics.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ZenhubWebhookReceivedEvent, ZenhubPollCompletedEvent } from '@edin/shared';

const SPRINT_ID = 'zenhub-sprint-123';
const SPRINT_NAME = 'Sprint 10';
const SPRINT_START = new Date('2026-03-01');
const SPRINT_END = new Date('2026-03-14');
const METRIC_ID = 'metric-uuid-1';

const mockMetric = {
  id: METRIC_ID,
  sprintId: SPRINT_ID,
  sprintName: SPRINT_NAME,
  sprintStart: SPRINT_START,
  sprintEnd: SPRINT_END,
  domain: null,
  velocity: 0,
  committedPoints: 30,
  deliveredPoints: 0,
  burndownData: null,
  cycleTimeAvg: null,
  leadTimeAvg: null,
  scopeChanges: 0,
  estimationAccuracy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  sprintMetric: {
    upsert: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  pipelineTransition: {
    create: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
  zenhubSync: {
    findUnique: vi.fn(),
  },
  scopeChange: {
    create: vi.fn(),
    count: vi.fn(),
    findMany: vi.fn(),
  },
  contributorSprintEstimation: {
    upsert: vi.fn(),
    findMany: vi.fn(),
  },
  evaluation: {
    groupBy: vi.fn(),
  },
  contributor: {
    findMany: vi.fn(),
  },
};

const mockEventEmitter = {
  emit: vi.fn(),
};

describe('SprintMetricsService', () => {
  let service: SprintMetricsService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        SprintMetricsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get(SprintMetricsService);
  });

  describe('upsertSprintMetric', () => {
    it('creates a new sprint metric and returns it', async () => {
      mockPrisma.sprintMetric.upsert.mockResolvedValue(mockMetric);

      const result = await service.upsertSprintMetric({
        sprintId: SPRINT_ID,
        sprintName: SPRINT_NAME,
        sprintStart: SPRINT_START,
        sprintEnd: SPRINT_END,
      });

      expect(result).toEqual(mockMetric);
      expect(mockPrisma.sprintMetric.upsert).toHaveBeenCalledWith({
        where: {
          sprintId_domain: {
            sprintId: SPRINT_ID,
            domain: null,
          },
        },
        update: {
          sprintName: SPRINT_NAME,
          sprintStart: SPRINT_START,
          sprintEnd: SPRINT_END,
        },
        create: {
          sprintId: SPRINT_ID,
          sprintName: SPRINT_NAME,
          sprintStart: SPRINT_START,
          sprintEnd: SPRINT_END,
          domain: null,
        },
      });
    });

    it('upserts with same sprintId+domain updating existing', async () => {
      const updatedMetric = { ...mockMetric, sprintName: 'Sprint 10 Updated' };
      mockPrisma.sprintMetric.upsert.mockResolvedValue(updatedMetric);

      const result = await service.upsertSprintMetric({
        sprintId: SPRINT_ID,
        sprintName: 'Sprint 10 Updated',
        sprintStart: SPRINT_START,
        sprintEnd: SPRINT_END,
      });

      expect(result.sprintName).toBe('Sprint 10 Updated');
      expect(mockPrisma.sprintMetric.upsert).toHaveBeenCalledTimes(1);
    });
  });

  describe('recordPipelineTransition', () => {
    it('creates a pipeline transition linked to a sprint metric', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(mockMetric);
      const mockTransition = {
        id: 'trans-uuid-1',
        sprintMetricId: METRIC_ID,
        issueId: 'issue-1',
        issueNumber: 42,
        fromPipeline: 'In Progress',
        toPipeline: 'Done',
        storyPoints: 5,
        contributorId: 'contributor-1',
        transitionedAt: new Date('2026-03-10'),
        createdAt: new Date(),
      };
      mockPrisma.pipelineTransition.create.mockResolvedValue(mockTransition);

      const result = await service.recordPipelineTransition({
        sprintId: SPRINT_ID,
        issueId: 'issue-1',
        issueNumber: 42,
        fromPipeline: 'In Progress',
        toPipeline: 'Done',
        storyPoints: 5,
        contributorId: 'contributor-1',
        transitionedAt: new Date('2026-03-10'),
      });

      expect(result.issueId).toBe('issue-1');
      expect(result.toPipeline).toBe('Done');
      expect(mockPrisma.pipelineTransition.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sprintMetricId: METRIC_ID,
          issueId: 'issue-1',
          issueNumber: 42,
          fromPipeline: 'In Progress',
          toPipeline: 'Done',
          storyPoints: 5,
          contributorId: 'contributor-1',
        }),
      });
    });

    it('throws when no sprint metric found', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(null);

      await expect(
        service.recordPipelineTransition({
          sprintId: 'nonexistent-sprint',
          issueId: 'issue-1',
          issueNumber: 42,
          fromPipeline: 'In Progress',
          toPipeline: 'Done',
          transitionedAt: new Date(),
        }),
      ).rejects.toThrow('No sprint metric found');
    });
  });

  describe('calculateVelocity', () => {
    it('sums story points of Done transitions correctly', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(mockMetric);
      mockPrisma.pipelineTransition.findMany.mockResolvedValue([
        { issueId: 'issue-1', storyPoints: 5, toPipeline: 'Done' },
        { issueId: 'issue-2', storyPoints: 8, toPipeline: 'Done' },
        { issueId: 'issue-3', storyPoints: 3, toPipeline: 'Done' },
      ]);
      mockPrisma.sprintMetric.update.mockResolvedValue({ ...mockMetric, velocity: 16 });

      const result = await service.calculateVelocity(SPRINT_ID);

      expect(result).toBe(16);
      expect(mockPrisma.sprintMetric.update).toHaveBeenCalledWith({
        where: { id: METRIC_ID },
        data: { velocity: 16, deliveredPoints: 16 },
      });
    });

    it('deduplicates by issueId (only counts latest per issue)', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(mockMetric);
      mockPrisma.pipelineTransition.findMany.mockResolvedValue([
        { issueId: 'issue-1', storyPoints: 5, toPipeline: 'Done' },
        { issueId: 'issue-1', storyPoints: 5, toPipeline: 'Done' }, // Duplicate
      ]);
      mockPrisma.sprintMetric.update.mockResolvedValue({ ...mockMetric, velocity: 5 });

      const result = await service.calculateVelocity(SPRINT_ID);

      expect(result).toBe(5); // Not 10
    });

    it('emits sprint.velocity.calculated event', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(mockMetric);
      mockPrisma.pipelineTransition.findMany.mockResolvedValue([
        { issueId: 'issue-1', storyPoints: 5, toPipeline: 'Done' },
      ]);
      mockPrisma.sprintMetric.update.mockResolvedValue({ ...mockMetric, velocity: 5 });

      await service.calculateVelocity(SPRINT_ID);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'sprint.velocity.calculated',
        expect.objectContaining({
          eventType: 'sprint.velocity.calculated',
          payload: expect.objectContaining({
            sprintId: SPRINT_ID,
            metricType: 'velocity',
            value: 5,
          }),
        }),
      );
    });

    it('returns 0 when no sprint metric found', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(null);

      const result = await service.calculateVelocity('nonexistent');

      expect(result).toBe(0);
    });
  });

  describe('calculateBurndown', () => {
    it('produces daily time-series data points', async () => {
      // 3-day sprint for simplicity
      const shortMetric = {
        ...mockMetric,
        sprintStart: new Date('2026-03-01'),
        sprintEnd: new Date('2026-03-03'),
        committedPoints: 10,
      };
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(shortMetric);
      mockPrisma.pipelineTransition.findMany.mockResolvedValue([
        {
          issueId: 'issue-1',
          storyPoints: 5,
          toPipeline: 'Done',
          transitionedAt: new Date('2026-03-02T10:00:00Z'),
        },
      ]);
      mockPrisma.sprintMetric.update.mockResolvedValue(shortMetric);

      const result = await service.calculateBurndown(SPRINT_ID);

      // Should have 3 data points (day 0, 1, 2)
      expect(result.length).toBe(3);
      expect(result[0].date).toBe('2026-03-01');
      expect(result[0].remainingPoints).toBe(10); // No completions on day 0
      expect(result[1].date).toBe('2026-03-02');
      expect(result[1].remainingPoints).toBe(5); // 5 points completed on day 1
      expect(result[2].date).toBe('2026-03-03');
      expect(result[2].remainingPoints).toBe(5); // No more completions

      // Verify ideal burndown
      expect(result[0].idealPoints).toBe(10);
      expect(result[2].idealPoints).toBe(0);
    });

    it('stores burndown data as JSONB', async () => {
      const shortMetric = {
        ...mockMetric,
        sprintStart: new Date('2026-03-01'),
        sprintEnd: new Date('2026-03-02'),
        committedPoints: 5,
      };
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(shortMetric);
      mockPrisma.pipelineTransition.findMany.mockResolvedValue([]);
      mockPrisma.sprintMetric.update.mockResolvedValue(shortMetric);

      await service.calculateBurndown(SPRINT_ID);

      expect(mockPrisma.sprintMetric.update).toHaveBeenCalledWith({
        where: { id: METRIC_ID },
        data: { burndownData: expect.any(Array) },
      });
    });

    it('returns empty array when no sprint metric found', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(null);

      const result = await service.calculateBurndown('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('calculateCycleTime', () => {
    it('computes correct average from In Progress to Done transitions', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(mockMetric);
      mockPrisma.pipelineTransition.findMany.mockResolvedValue([
        // Issue 1: 2 days cycle time
        {
          issueId: 'issue-1',
          fromPipeline: 'Backlog',
          toPipeline: 'In Progress',
          transitionedAt: new Date('2026-03-01'),
        },
        {
          issueId: 'issue-1',
          fromPipeline: 'In Progress',
          toPipeline: 'Done',
          transitionedAt: new Date('2026-03-03'),
        },
        // Issue 2: 4 days cycle time
        {
          issueId: 'issue-2',
          fromPipeline: 'Backlog',
          toPipeline: 'In Progress',
          transitionedAt: new Date('2026-03-02'),
        },
        {
          issueId: 'issue-2',
          fromPipeline: 'In Progress',
          toPipeline: 'Done',
          transitionedAt: new Date('2026-03-06'),
        },
      ]);
      mockPrisma.sprintMetric.update.mockResolvedValue({ ...mockMetric, cycleTimeAvg: 3 });

      const result = await service.calculateCycleTime(SPRINT_ID);

      expect(result).toBe(3); // Average of 2 and 4 days
    });

    it('returns null when no Done transitions exist', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(mockMetric);
      mockPrisma.pipelineTransition.findMany.mockResolvedValue([
        {
          issueId: 'issue-1',
          fromPipeline: 'Backlog',
          toPipeline: 'In Progress',
          transitionedAt: new Date('2026-03-01'),
        },
      ]);
      mockPrisma.sprintMetric.update.mockResolvedValue({ ...mockMetric, cycleTimeAvg: null });

      const result = await service.calculateCycleTime(SPRINT_ID);

      expect(result).toBeNull();
    });
  });

  describe('calculateLeadTime', () => {
    it('computes correct average from first transition to Done', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(mockMetric);
      mockPrisma.pipelineTransition.findMany.mockResolvedValue([
        // Issue 1: 5 days lead time (first transition to Done)
        {
          issueId: 'issue-1',
          fromPipeline: 'New',
          toPipeline: 'Backlog',
          transitionedAt: new Date('2026-03-01'),
        },
        {
          issueId: 'issue-1',
          fromPipeline: 'Backlog',
          toPipeline: 'In Progress',
          transitionedAt: new Date('2026-03-03'),
        },
        {
          issueId: 'issue-1',
          fromPipeline: 'In Progress',
          toPipeline: 'Done',
          transitionedAt: new Date('2026-03-06'),
        },
        // Issue 2: 3 days lead time
        {
          issueId: 'issue-2',
          fromPipeline: 'New',
          toPipeline: 'In Progress',
          transitionedAt: new Date('2026-03-02'),
        },
        {
          issueId: 'issue-2',
          fromPipeline: 'In Progress',
          toPipeline: 'Done',
          transitionedAt: new Date('2026-03-05'),
        },
      ]);
      mockPrisma.sprintMetric.update.mockResolvedValue({ ...mockMetric, leadTimeAvg: 4 });

      const result = await service.calculateLeadTime(SPRINT_ID);

      expect(result).toBe(4); // Average of 5 and 3 days
    });

    it('returns null when no sprint metric found', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(null);

      const result = await service.calculateLeadTime('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('recordScopeChange', () => {
    it('creates a scope change record', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(mockMetric);
      const mockScopeChange = {
        id: 'scope-uuid-1',
        sprintMetricId: METRIC_ID,
        issueId: 'issue-10',
        issueNumber: 10,
        changeType: 'ADDED',
        storyPoints: 3,
        changedAt: new Date('2026-03-07'),
        createdAt: new Date(),
      };
      mockPrisma.scopeChange.create.mockResolvedValue(mockScopeChange);

      const result = await service.recordScopeChange({
        sprintId: SPRINT_ID,
        issueId: 'issue-10',
        issueNumber: 10,
        changeType: 'ADDED',
        storyPoints: 3,
        changedAt: new Date('2026-03-07'),
      });

      expect(result.issueId).toBe('issue-10');
      expect(result.changeType).toBe('ADDED');
      expect(mockPrisma.scopeChange.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sprintMetricId: METRIC_ID,
          issueId: 'issue-10',
          changeType: 'ADDED',
          storyPoints: 3,
        }),
      });
      // Count is NOT updated here — it's handled by calculateScopeChanges() in recalculateAllMetrics()
      expect(mockPrisma.scopeChange.count).not.toHaveBeenCalled();
    });

    it('emits sprint.scope.changed event', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(mockMetric);
      mockPrisma.scopeChange.create.mockResolvedValue({ id: 'scope-1' });

      await service.recordScopeChange({
        sprintId: SPRINT_ID,
        issueId: 'issue-11',
        issueNumber: 11,
        changeType: 'REMOVED',
        changedAt: new Date(),
      });

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'sprint.scope.changed',
        expect.objectContaining({
          eventType: 'sprint.scope.changed',
          payload: expect.objectContaining({
            sprintId: SPRINT_ID,
            issueId: 'issue-11',
            changeType: 'REMOVED',
          }),
        }),
      );
    });

    it('throws when no sprint metric found', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(null);

      await expect(
        service.recordScopeChange({
          sprintId: 'nonexistent',
          issueId: 'issue-1',
          issueNumber: 1,
          changeType: 'ADDED',
          changedAt: new Date(),
        }),
      ).rejects.toThrow('No sprint metric found');
    });
  });

  describe('calculateScopeChanges', () => {
    it('counts scope changes correctly and updates metric', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(mockMetric);
      mockPrisma.scopeChange.count.mockResolvedValue(4);
      mockPrisma.sprintMetric.update.mockResolvedValue({ ...mockMetric, scopeChanges: 4 });

      const result = await service.calculateScopeChanges(SPRINT_ID);

      expect(result).toBe(4);
      expect(mockPrisma.sprintMetric.update).toHaveBeenCalledWith({
        where: { id: METRIC_ID },
        data: { scopeChanges: 4 },
      });
    });

    it('returns 0 when no sprint metric found', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(null);

      const result = await service.calculateScopeChanges('nonexistent');

      expect(result).toBe(0);
    });
  });

  describe('calculateEstimationAccuracy', () => {
    it('computes correct percentages per contributor', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(mockMetric);
      mockPrisma.pipelineTransition.findMany.mockResolvedValue([
        // Contributor A: planned 8 points, delivered 8 points (100%)
        {
          issueId: 'issue-1',
          contributorId: 'contributor-a',
          storyPoints: 5,
          fromPipeline: 'Backlog',
          toPipeline: 'In Progress',
          transitionedAt: new Date('2026-03-01'),
        },
        {
          issueId: 'issue-1',
          contributorId: 'contributor-a',
          storyPoints: 5,
          fromPipeline: 'In Progress',
          toPipeline: 'Done',
          transitionedAt: new Date('2026-03-05'),
        },
        {
          issueId: 'issue-2',
          contributorId: 'contributor-a',
          storyPoints: 3,
          fromPipeline: 'Backlog',
          toPipeline: 'In Progress',
          transitionedAt: new Date('2026-03-02'),
        },
        {
          issueId: 'issue-2',
          contributorId: 'contributor-a',
          storyPoints: 3,
          fromPipeline: 'In Progress',
          toPipeline: 'Done',
          transitionedAt: new Date('2026-03-06'),
        },
        // Contributor B: planned 5 points, delivered 0 points (0%)
        {
          issueId: 'issue-3',
          contributorId: 'contributor-b',
          storyPoints: 5,
          fromPipeline: 'Backlog',
          toPipeline: 'In Progress',
          transitionedAt: new Date('2026-03-03'),
        },
      ]);
      mockPrisma.contributorSprintEstimation.upsert.mockResolvedValue({});
      mockPrisma.sprintMetric.update.mockResolvedValue({ ...mockMetric, estimationAccuracy: 50 });

      const result = await service.calculateEstimationAccuracy(SPRINT_ID);

      // Contributor A: 100%, Contributor B: 0%, average = 50%
      expect(result).toBe(50);

      // Verify upsert calls for both contributors
      expect(mockPrisma.contributorSprintEstimation.upsert).toHaveBeenCalledTimes(2);
    });

    it('returns null when no contributors have planned points', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(mockMetric);
      mockPrisma.pipelineTransition.findMany.mockResolvedValue([
        // Transitions without contributorId
        {
          issueId: 'issue-1',
          contributorId: null,
          storyPoints: 5,
          fromPipeline: 'Backlog',
          toPipeline: 'Done',
          transitionedAt: new Date('2026-03-05'),
        },
      ]);
      mockPrisma.sprintMetric.update.mockResolvedValue({ ...mockMetric, estimationAccuracy: null });

      const result = await service.calculateEstimationAccuracy(SPRINT_ID);

      expect(result).toBeNull();
    });

    it('emits sprint.estimation.calculated event', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(mockMetric);
      mockPrisma.pipelineTransition.findMany.mockResolvedValue([
        {
          issueId: 'issue-1',
          contributorId: 'contributor-a',
          storyPoints: 5,
          fromPipeline: 'In Progress',
          toPipeline: 'Done',
          transitionedAt: new Date('2026-03-05'),
        },
      ]);
      mockPrisma.contributorSprintEstimation.upsert.mockResolvedValue({});
      mockPrisma.sprintMetric.update.mockResolvedValue(mockMetric);

      await service.calculateEstimationAccuracy(SPRINT_ID);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'sprint.estimation.calculated',
        expect.objectContaining({
          eventType: 'sprint.estimation.calculated',
          payload: expect.objectContaining({
            sprintId: SPRINT_ID,
          }),
        }),
      );
    });

    it('returns null when no sprint metric found', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(null);

      const result = await service.calculateEstimationAccuracy('nonexistent');

      expect(result).toBeNull();
    });

    it('uses latest estimate when story points change between transitions', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(mockMetric);
      // Issue starts with 3 points at In Progress, then estimate changes to 8 before Done
      mockPrisma.pipelineTransition.findMany.mockResolvedValue([
        {
          issueId: 'issue-1',
          contributorId: 'contributor-a',
          storyPoints: 3,
          fromPipeline: 'Backlog',
          toPipeline: 'In Progress',
          transitionedAt: new Date('2026-03-01'),
        },
        {
          issueId: 'issue-1',
          contributorId: 'contributor-a',
          storyPoints: 8, // Estimate changed after moving to In Progress
          fromPipeline: 'In Progress',
          toPipeline: 'Done',
          transitionedAt: new Date('2026-03-05'),
        },
      ]);
      mockPrisma.contributorSprintEstimation.upsert.mockResolvedValue({});
      mockPrisma.sprintMetric.update.mockResolvedValue(mockMetric);

      await service.calculateEstimationAccuracy(SPRINT_ID);

      // Both planned and delivered should use latest estimate (8) per issue
      // planned = 8, delivered = 8, accuracy = 100%
      expect(mockPrisma.contributorSprintEstimation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            plannedPoints: 8,
            deliveredPoints: 8,
            accuracy: 100,
          }),
        }),
      );
    });
  });

  describe('getContributorEstimations', () => {
    it('returns per-contributor estimation data', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(mockMetric);
      const estimations = [
        {
          id: 'est-1',
          sprintMetricId: METRIC_ID,
          contributorId: 'contributor-a',
          plannedPoints: 8,
          deliveredPoints: 8,
          accuracy: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'est-2',
          sprintMetricId: METRIC_ID,
          contributorId: 'contributor-b',
          plannedPoints: 5,
          deliveredPoints: 3,
          accuracy: 60,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrisma.contributorSprintEstimation.findMany.mockResolvedValue(estimations);

      const result = await service.getContributorEstimations(SPRINT_ID);

      expect(result).toHaveLength(2);
      expect(result[0].contributorId).toBe('contributor-a');
      expect(result[1].accuracy).toBe(60);
    });

    it('returns empty array when no sprint metric found', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(null);

      const result = await service.getContributorEstimations('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('recalculateAllMetrics', () => {
    it('is idempotent — same input produces same output', async () => {
      const metricWithValues = {
        ...mockMetric,
        velocity: 16,
        cycleTimeAvg: 3,
        leadTimeAvg: 4,
        committedPoints: 20,
        scopeChanges: 2,
        estimationAccuracy: 75,
      };
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(metricWithValues);
      mockPrisma.pipelineTransition.findMany.mockResolvedValue([
        {
          issueId: 'issue-1',
          storyPoints: 8,
          toPipeline: 'Done',
          contributorId: 'c-1',
          transitionedAt: new Date('2026-03-05'),
        },
        {
          issueId: 'issue-2',
          storyPoints: 8,
          toPipeline: 'Done',
          contributorId: 'c-1',
          transitionedAt: new Date('2026-03-10'),
        },
      ]);
      mockPrisma.sprintMetric.update.mockResolvedValue(metricWithValues);
      mockPrisma.scopeChange.count.mockResolvedValue(2);
      mockPrisma.contributorSprintEstimation.upsert.mockResolvedValue({});

      // First calculation
      const result1 = await service.recalculateAllMetrics(SPRINT_ID);

      vi.clearAllMocks();
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(metricWithValues);
      mockPrisma.pipelineTransition.findMany.mockResolvedValue([
        {
          issueId: 'issue-1',
          storyPoints: 8,
          toPipeline: 'Done',
          contributorId: 'c-1',
          transitionedAt: new Date('2026-03-05'),
        },
        {
          issueId: 'issue-2',
          storyPoints: 8,
          toPipeline: 'Done',
          contributorId: 'c-1',
          transitionedAt: new Date('2026-03-10'),
        },
      ]);
      mockPrisma.sprintMetric.update.mockResolvedValue(metricWithValues);
      mockPrisma.scopeChange.count.mockResolvedValue(2);
      mockPrisma.contributorSprintEstimation.upsert.mockResolvedValue({});

      // Second calculation — same data
      const result2 = await service.recalculateAllMetrics(SPRINT_ID);

      expect(result1.velocity).toEqual(result2.velocity);
      expect(result1.cycleTimeAvg).toEqual(result2.cycleTimeAvg);
      expect(result1.leadTimeAvg).toEqual(result2.leadTimeAvg);
      expect(result1.scopeChanges).toEqual(result2.scopeChanges);
      expect(result1.estimationAccuracy).toEqual(result2.estimationAccuracy);
    });

    it('emits sprint.metrics.recalculated event', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(mockMetric);
      mockPrisma.pipelineTransition.findMany.mockResolvedValue([]);
      mockPrisma.sprintMetric.update.mockResolvedValue(mockMetric);
      mockPrisma.scopeChange.count.mockResolvedValue(0);

      await service.recalculateAllMetrics(SPRINT_ID);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'sprint.metrics.recalculated',
        expect.objectContaining({
          eventType: 'sprint.metrics.recalculated',
          payload: expect.objectContaining({
            sprintId: SPRINT_ID,
            metricType: 'all',
          }),
        }),
      );
    });

    it('includes scope changes and estimation accuracy', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(mockMetric);
      mockPrisma.pipelineTransition.findMany.mockResolvedValue([]);
      mockPrisma.sprintMetric.update.mockResolvedValue(mockMetric);
      mockPrisma.scopeChange.count.mockResolvedValue(3);

      await service.recalculateAllMetrics(SPRINT_ID);

      // Scope changes should have been calculated
      expect(mockPrisma.scopeChange.count).toHaveBeenCalledWith({
        where: { sprintMetricId: METRIC_ID },
      });
    });
  });

  describe('handleWebhookEvent', () => {
    it('routes issue_moved events to recordPipelineTransition', async () => {
      const webhookEvent: ZenhubWebhookReceivedEvent = {
        eventType: 'zenhub.webhook.received',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-1',
        payload: {
          syncId: 'sync-1',
          webhookEventType: 'issue_moved',
          deliveryId: 'del-1',
        },
      };

      mockPrisma.zenhubSync.findUnique.mockResolvedValue({
        id: 'sync-1',
        payload: {
          sprint_id: SPRINT_ID,
          issue_id: 'issue-1',
          issue_number: 42,
          from_pipeline: 'In Progress',
          to_pipeline: 'Done',
          story_points: 5,
        },
      });
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(mockMetric);
      mockPrisma.pipelineTransition.create.mockResolvedValue({ id: 'trans-1' });
      mockPrisma.pipelineTransition.findMany.mockResolvedValue([]);
      mockPrisma.sprintMetric.update.mockResolvedValue(mockMetric);
      mockPrisma.scopeChange.count.mockResolvedValue(0);

      await service.handleWebhookEvent(webhookEvent);

      expect(mockPrisma.pipelineTransition.create).toHaveBeenCalled();
    });

    it('ignores non-handled events', async () => {
      const webhookEvent: ZenhubWebhookReceivedEvent = {
        eventType: 'zenhub.webhook.received',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-1',
        payload: {
          syncId: 'sync-1',
          webhookEventType: 'sprint_started',
          deliveryId: 'del-1',
        },
      };

      await service.handleWebhookEvent(webhookEvent);

      expect(mockPrisma.zenhubSync.findUnique).not.toHaveBeenCalled();
    });

    it('handles estimate_changed events by updating transitions', async () => {
      const webhookEvent: ZenhubWebhookReceivedEvent = {
        eventType: 'zenhub.webhook.received',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-2',
        payload: {
          syncId: 'sync-2',
          webhookEventType: 'estimate_changed',
          deliveryId: 'del-2',
        },
      };

      mockPrisma.zenhubSync.findUnique.mockResolvedValue({
        id: 'sync-2',
        payload: {
          sprint_id: SPRINT_ID,
          issue_id: 'issue-5',
          new_estimate: 8,
        },
      });
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(mockMetric);
      mockPrisma.pipelineTransition.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.pipelineTransition.findMany.mockResolvedValue([]);
      mockPrisma.sprintMetric.update.mockResolvedValue(mockMetric);
      mockPrisma.scopeChange.count.mockResolvedValue(0);

      await service.handleWebhookEvent(webhookEvent);

      expect(mockPrisma.pipelineTransition.updateMany).toHaveBeenCalledWith({
        where: {
          sprintMetricId: METRIC_ID,
          issueId: 'issue-5',
        },
        data: { storyPoints: 8 },
      });
    });

    it('handles issue_transferred events as scope changes', async () => {
      const webhookEvent: ZenhubWebhookReceivedEvent = {
        eventType: 'zenhub.webhook.received',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-3',
        payload: {
          syncId: 'sync-3',
          webhookEventType: 'issue_transferred',
          deliveryId: 'del-3',
        },
      };

      mockPrisma.zenhubSync.findUnique.mockResolvedValue({
        id: 'sync-3',
        payload: {
          sprint_id: SPRINT_ID,
          issue_id: 'issue-7',
          issue_number: 7,
          story_points: 5,
          transfer_type: 'in',
        },
      });
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(mockMetric);
      mockPrisma.scopeChange.create.mockResolvedValue({ id: 'scope-1' });
      mockPrisma.scopeChange.count.mockResolvedValue(1);
      mockPrisma.sprintMetric.update.mockResolvedValue(mockMetric);
      mockPrisma.pipelineTransition.findMany.mockResolvedValue([]);

      await service.handleWebhookEvent(webhookEvent);

      expect(mockPrisma.scopeChange.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sprintMetricId: METRIC_ID,
          issueId: 'issue-7',
          changeType: 'ADDED',
          storyPoints: 5,
        }),
      });
    });

    it('records REMOVED scope change for issue_transferred out', async () => {
      const webhookEvent: ZenhubWebhookReceivedEvent = {
        eventType: 'zenhub.webhook.received',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-4',
        payload: {
          syncId: 'sync-4',
          webhookEventType: 'issue_transferred',
          deliveryId: 'del-4',
        },
      };

      mockPrisma.zenhubSync.findUnique.mockResolvedValue({
        id: 'sync-4',
        payload: {
          sprint_id: SPRINT_ID,
          issue_id: 'issue-8',
          issue_number: 8,
          story_points: 3,
          transfer_type: 'out',
        },
      });
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(mockMetric);
      mockPrisma.scopeChange.create.mockResolvedValue({ id: 'scope-2' });
      mockPrisma.scopeChange.count.mockResolvedValue(2);
      mockPrisma.sprintMetric.update.mockResolvedValue(mockMetric);
      mockPrisma.pipelineTransition.findMany.mockResolvedValue([]);

      await service.handleWebhookEvent(webhookEvent);

      expect(mockPrisma.scopeChange.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          changeType: 'REMOVED',
          storyPoints: 3,
        }),
      });
    });
  });

  describe('handlePollCompleted', () => {
    it('processes bulk sprint data and upserts metrics', async () => {
      const pollEvent: ZenhubPollCompletedEvent = {
        eventType: 'zenhub.poll.completed',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-poll-1',
        payload: {
          syncId: 'sync-poll-1',
          sprintCount: 2,
          issueCount: 10,
          durationMs: 5000,
        },
      };

      mockPrisma.zenhubSync.findUnique.mockResolvedValue({
        id: 'sync-poll-1',
        payload: {
          sprints: [
            { id: 'sprint-1', name: 'Sprint 9', startAt: '2026-02-15', endAt: '2026-02-28' },
            { id: 'sprint-2', name: 'Sprint 10', startAt: '2026-03-01', endAt: '2026-03-14' },
          ],
        },
      });
      mockPrisma.sprintMetric.upsert.mockResolvedValue(mockMetric);

      await service.handlePollCompleted(pollEvent);

      expect(mockPrisma.sprintMetric.upsert).toHaveBeenCalledTimes(2);
    });

    it('handles poll with no payload gracefully', async () => {
      const pollEvent: ZenhubPollCompletedEvent = {
        eventType: 'zenhub.poll.completed',
        timestamp: new Date().toISOString(),
        correlationId: 'corr-poll-2',
        payload: {
          syncId: 'sync-poll-2',
          sprintCount: 0,
          issueCount: 0,
          durationMs: 1000,
        },
      };

      mockPrisma.zenhubSync.findUnique.mockResolvedValue({
        id: 'sync-poll-2',
        payload: null,
      });

      await service.handlePollCompleted(pollEvent);

      expect(mockPrisma.sprintMetric.upsert).not.toHaveBeenCalled();
    });
  });

  describe('getVelocityChartData', () => {
    it('returns chart-ready format in chronological order', async () => {
      mockPrisma.sprintMetric.findMany.mockResolvedValue([
        { sprintEnd: new Date('2026-03-14'), velocity: 25, sprintName: 'Sprint 11' },
        { sprintEnd: new Date('2026-02-28'), velocity: 20, sprintName: 'Sprint 10' },
        { sprintEnd: new Date('2026-02-14'), velocity: 15, sprintName: 'Sprint 9' },
      ]);

      const result = await service.getVelocityChartData({ limit: 12 });

      // Should be reversed to chronological (oldest first)
      expect(result).toEqual([
        { x: '2026-02-14', y: 15, label: 'Sprint 9' },
        { x: '2026-02-28', y: 20, label: 'Sprint 10' },
        { x: '2026-03-14', y: 25, label: 'Sprint 11' },
      ]);
    });

    it('filters by domain', async () => {
      mockPrisma.sprintMetric.findMany.mockResolvedValue([]);

      await service.getVelocityChartData({ domain: 'Technology', limit: 12 });

      expect(mockPrisma.sprintMetric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { domain: 'Technology' },
        }),
      );
    });

    it('respects limit', async () => {
      mockPrisma.sprintMetric.findMany.mockResolvedValue([]);

      await service.getVelocityChartData({ limit: 6 });

      expect(mockPrisma.sprintMetric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 6,
        }),
      );
    });
  });

  describe('getBurndownChartData', () => {
    it('returns parsed JSONB burndown data', async () => {
      const burndownData = [
        { date: '2026-03-01', remainingPoints: 30, idealPoints: 30 },
        { date: '2026-03-02', remainingPoints: 25, idealPoints: 25 },
      ];
      mockPrisma.sprintMetric.findFirst.mockResolvedValue({
        ...mockMetric,
        burndownData,
      });

      const result = await service.getBurndownChartData(SPRINT_ID);

      expect(result).toEqual(burndownData);
    });

    it('returns empty array for missing sprint', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue(null);

      const result = await service.getBurndownChartData('nonexistent');

      expect(result).toEqual([]);
    });

    it('returns empty array when no burndown data exists', async () => {
      mockPrisma.sprintMetric.findFirst.mockResolvedValue({
        ...mockMetric,
        burndownData: null,
      });

      const result = await service.getBurndownChartData(SPRINT_ID);

      expect(result).toEqual([]);
    });
  });

  describe('listSprints', () => {
    it('returns paginated sprint list', async () => {
      const metrics = [
        {
          id: 'metric-1',
          sprintId: 'zh-sprint-1',
          sprintName: 'Sprint 11',
          sprintStart: new Date('2026-03-01'),
          sprintEnd: new Date('2026-03-14'),
          velocity: 25,
          committedPoints: 30,
          deliveredPoints: 25,
        },
      ];
      mockPrisma.sprintMetric.findMany.mockResolvedValue(metrics);

      const result = await service.listSprints({ limit: 12 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].sprintName).toBe('Sprint 11');
      expect(result.data[0].sprintStart).toContain('2026-03-01');
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.cursor).toBe('metric-1');
    });

    it('detects hasMore when extra record exists', async () => {
      // Return limit+1 records to indicate hasMore
      const metrics = Array.from({ length: 3 }, (_, i) => ({
        id: `metric-${i}`,
        sprintId: `zh-sprint-${i}`,
        sprintName: `Sprint ${10 + i}`,
        sprintStart: new Date(`2026-0${3 - i}-01`),
        sprintEnd: new Date(`2026-0${3 - i}-14`),
        velocity: 20 + i,
        committedPoints: 30,
        deliveredPoints: 20 + i,
      }));
      mockPrisma.sprintMetric.findMany.mockResolvedValue(metrics);

      const result = await service.listSprints({ limit: 2 });

      expect(result.data).toHaveLength(2); // Trimmed to limit
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.cursor).toBe('metric-1');
    });
  });

  describe('getSprintMetricById', () => {
    it('returns typed detail DTO by database ID', async () => {
      mockPrisma.sprintMetric.findUnique.mockResolvedValue(mockMetric);

      const result = await service.getSprintMetricById('metric-uuid-1');

      expect(result).not.toBeNull();
      expect(result!.id).toBe(METRIC_ID);
      expect(result!.sprintName).toBe(SPRINT_NAME);
      expect(result!.velocity).toBe(0);
      // Dates are serialized as ISO strings
      expect(typeof result!.sprintStart).toBe('string');
      expect(typeof result!.sprintEnd).toBe('string');
      expect(mockPrisma.sprintMetric.findUnique).toHaveBeenCalledWith({
        where: { id: 'metric-uuid-1' },
      });
    });

    it('returns null for unknown ID', async () => {
      mockPrisma.sprintMetric.findUnique.mockResolvedValue(null);

      const result = await service.getSprintMetricById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getScopeChangeHistory', () => {
    it('returns mapped ScopeChangeRecord DTOs', async () => {
      mockPrisma.sprintMetric.findUnique.mockResolvedValue(mockMetric);
      mockPrisma.scopeChange.findMany.mockResolvedValue([
        {
          id: 'sc-1',
          sprintMetricId: METRIC_ID,
          issueId: 'issue-10',
          issueNumber: 10,
          changeType: 'ADDED',
          storyPoints: 5,
          changedAt: new Date('2026-03-05T10:00:00.000Z'),
        },
        {
          id: 'sc-2',
          sprintMetricId: METRIC_ID,
          issueId: 'issue-11',
          issueNumber: 11,
          changeType: 'REMOVED',
          storyPoints: 3,
          changedAt: new Date('2026-03-04T14:00:00.000Z'),
        },
      ]);

      const result = await service.getScopeChangeHistory(METRIC_ID, { limit: 50 });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'sc-1',
        issueId: 'issue-10',
        issueNumber: 10,
        changeType: 'ADDED',
        storyPoints: 5,
        changedAt: '2026-03-05T10:00:00.000Z',
      });
      expect(result[1].changeType).toBe('REMOVED');
      expect(typeof result[1].changedAt).toBe('string');
    });

    it('respects limit parameter', async () => {
      mockPrisma.sprintMetric.findUnique.mockResolvedValue(mockMetric);
      mockPrisma.scopeChange.findMany.mockResolvedValue([]);

      await service.getScopeChangeHistory(METRIC_ID, { limit: 10 });

      expect(mockPrisma.scopeChange.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });

    it('returns empty array for unknown sprint metric', async () => {
      mockPrisma.sprintMetric.findUnique.mockResolvedValue(null);

      const result = await service.getScopeChangeHistory('nonexistent', { limit: 50 });

      expect(result).toEqual([]);
      expect(mockPrisma.scopeChange.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getContributorAccuracyTrends', () => {
    it('aggregates per-contributor accuracy across sprints', async () => {
      const sprint1 = {
        id: 'metric-a',
        sprintId: 'zh-sprint-a',
        sprintName: 'Sprint 9',
        sprintEnd: new Date('2026-02-28'),
      };
      const sprint2 = {
        id: 'metric-b',
        sprintId: 'zh-sprint-b',
        sprintName: 'Sprint 10',
        sprintEnd: new Date('2026-03-14'),
      };
      mockPrisma.sprintMetric.findMany.mockResolvedValue([sprint2, sprint1]); // desc order

      mockPrisma.contributorSprintEstimation.findMany.mockResolvedValue([
        {
          id: 'est-1',
          sprintMetricId: 'metric-a',
          contributorId: 'contrib-1',
          plannedPoints: 10,
          deliveredPoints: 8,
          accuracy: 80,
        },
        {
          id: 'est-2',
          sprintMetricId: 'metric-b',
          contributorId: 'contrib-1',
          plannedPoints: 12,
          deliveredPoints: 12,
          accuracy: 100,
        },
        {
          id: 'est-3',
          sprintMetricId: 'metric-b',
          contributorId: 'contrib-2',
          plannedPoints: 8,
          deliveredPoints: 6,
          accuracy: 75,
        },
      ]);

      const result = await service.getContributorAccuracyTrends({ limit: 12 });

      expect(result).toHaveLength(2);
      // Sorted by contributorId
      expect(result[0].contributorId).toBe('contrib-1');
      expect(result[0].sprints).toHaveLength(2);
      // Chronological order (oldest first)
      expect(result[0].sprints[0].sprintName).toBe('Sprint 9');
      expect(result[0].sprints[0].accuracy).toBe(80);
      expect(result[0].sprints[1].sprintName).toBe('Sprint 10');
      expect(result[0].sprints[1].accuracy).toBe(100);

      expect(result[1].contributorId).toBe('contrib-2');
      expect(result[1].sprints).toHaveLength(1);
    });

    it('filters by domain', async () => {
      mockPrisma.sprintMetric.findMany.mockResolvedValue([]);

      await service.getContributorAccuracyTrends({ domain: 'Technology', limit: 12 });

      expect(mockPrisma.sprintMetric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { domain: 'Technology' },
        }),
      );
    });

    it('returns empty array when no sprints exist', async () => {
      mockPrisma.sprintMetric.findMany.mockResolvedValue([]);

      const result = await service.getContributorAccuracyTrends({ limit: 12 });

      expect(result).toEqual([]);
      expect(mockPrisma.contributorSprintEstimation.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getCombinedContributorMetrics', () => {
    it('returns combined sprint + evaluation data per contributor', async () => {
      mockPrisma.sprintMetric.findMany.mockResolvedValue([{ id: 'metric-a' }, { id: 'metric-b' }]);
      mockPrisma.contributorSprintEstimation.findMany.mockResolvedValue([
        {
          sprintMetricId: 'metric-a',
          contributorId: 'contrib-1',
          plannedPoints: 10,
          deliveredPoints: 8,
          accuracy: 80,
        },
        {
          sprintMetricId: 'metric-b',
          contributorId: 'contrib-1',
          plannedPoints: 12,
          deliveredPoints: 12,
          accuracy: 100,
        },
      ]);
      mockPrisma.evaluation.groupBy.mockResolvedValue([
        {
          contributorId: 'contrib-1',
          _count: { id: 5 },
          _avg: { compositeScore: 75.5 },
        },
      ]);
      mockPrisma.contributor.findMany.mockResolvedValue([
        { id: 'contrib-1', name: 'Alice', githubUsername: 'alice' },
      ]);

      const result = await service.getCombinedContributorMetrics({ limit: 12 });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        contributorId: 'contrib-1',
        contributorName: 'Alice',
        githubUsername: 'alice',
        sprintCount: 2,
        totalPlannedPoints: 22,
        totalDeliveredPoints: 20,
        averageAccuracy: 90,
        evaluationCount: 5,
        averageEvaluationScore: 75.5,
      });
    });

    it('handles contributors with no evaluations', async () => {
      mockPrisma.sprintMetric.findMany.mockResolvedValue([{ id: 'metric-a' }]);
      mockPrisma.contributorSprintEstimation.findMany.mockResolvedValue([
        {
          sprintMetricId: 'metric-a',
          contributorId: 'contrib-1',
          plannedPoints: 10,
          deliveredPoints: 8,
          accuracy: 80,
        },
      ]);
      mockPrisma.evaluation.groupBy.mockResolvedValue([]);
      mockPrisma.contributor.findMany.mockResolvedValue([
        { id: 'contrib-1', name: 'Bob', githubUsername: null },
      ]);

      const result = await service.getCombinedContributorMetrics({ limit: 12 });

      expect(result).toHaveLength(1);
      expect(result[0].evaluationCount).toBe(0);
      expect(result[0].averageEvaluationScore).toBeNull();
    });

    it('filters by domain', async () => {
      mockPrisma.sprintMetric.findMany.mockResolvedValue([]);

      await service.getCombinedContributorMetrics({ domain: 'Technology', limit: 12 });

      expect(mockPrisma.sprintMetric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { domain: 'Technology' },
        }),
      );
    });

    it('returns empty array when no sprints exist', async () => {
      mockPrisma.sprintMetric.findMany.mockResolvedValue([]);

      const result = await service.getCombinedContributorMetrics({ limit: 12 });

      expect(result).toEqual([]);
    });
  });

  describe('generateSprintReportCsv', () => {
    it('generates valid CSV with velocity and contributor sections', async () => {
      mockPrisma.sprintMetric.findMany.mockResolvedValue([
        {
          sprintEnd: new Date('2026-03-14'),
          velocity: 25,
          sprintName: 'Sprint 11',
          id: 'metric-1',
        },
      ]);
      mockPrisma.contributorSprintEstimation.findMany.mockResolvedValue([
        {
          sprintMetricId: 'metric-1',
          contributorId: 'contrib-1',
          plannedPoints: 10,
          deliveredPoints: 8,
          accuracy: 80,
        },
      ]);
      mockPrisma.evaluation.groupBy.mockResolvedValue([
        {
          contributorId: 'contrib-1',
          _count: { id: 3 },
          _avg: { compositeScore: 72 },
        },
      ]);
      mockPrisma.contributor.findMany.mockResolvedValue([
        { id: 'contrib-1', name: 'Alice', githubUsername: 'alice' },
      ]);

      const csv = await service.generateSprintReportCsv({ limit: 12 });

      expect(csv).toContain('Sprint Velocity Report');
      expect(csv).toContain('Sprint,End Date,Velocity (pts)');
      expect(csv).toContain('"Sprint 11","2026-03-14",25');
      expect(csv).toContain('Contributor Metrics');
      expect(csv).toContain('"Alice","alice",1,10,8,80,3,72');
    });

    it('handles empty data gracefully', async () => {
      mockPrisma.sprintMetric.findMany.mockResolvedValue([]);

      const csv = await service.generateSprintReportCsv({ limit: 12 });

      expect(csv).toContain('Sprint Velocity Report');
      expect(csv).toContain('Contributor Metrics');
    });

    it('escapes double quotes and formula injection in CSV fields', async () => {
      mockPrisma.sprintMetric.findMany.mockResolvedValue([
        {
          sprintEnd: new Date('2026-03-14'),
          velocity: 10,
          sprintName: 'Sprint "Q1"',
          id: 'metric-1',
        },
      ]);
      mockPrisma.contributorSprintEstimation.findMany.mockResolvedValue([
        {
          sprintMetricId: 'metric-1',
          contributorId: 'contrib-1',
          plannedPoints: 5,
          deliveredPoints: 5,
          accuracy: 100,
        },
      ]);
      mockPrisma.evaluation.groupBy.mockResolvedValue([]);
      mockPrisma.contributor.findMany.mockResolvedValue([
        { id: 'contrib-1', name: '=CMD()', githubUsername: null },
      ]);

      const csv = await service.generateSprintReportCsv({ limit: 12 });

      // Double quotes escaped per RFC 4180
      expect(csv).toContain('"Sprint ""Q1"""');
      // Formula injection neutralized with leading apostrophe
      expect(csv).toContain('"\'=CMD()"');
    });
  });

  describe('generateSprintReportPdf', () => {
    it('generates a valid PDF buffer', async () => {
      mockPrisma.sprintMetric.findMany.mockResolvedValue([
        {
          sprintEnd: new Date('2026-03-14'),
          velocity: 25,
          sprintName: 'Sprint 11',
          id: 'metric-1',
        },
      ]);
      mockPrisma.contributorSprintEstimation.findMany.mockResolvedValue([]);
      mockPrisma.evaluation.groupBy.mockResolvedValue([]);
      mockPrisma.contributor.findMany.mockResolvedValue([]);

      const pdf = await service.generateSprintReportPdf({ limit: 12 });

      expect(pdf).toBeInstanceOf(Buffer);
      expect(pdf.length).toBeGreaterThan(0);
      // PDF magic bytes
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    });
  });
});

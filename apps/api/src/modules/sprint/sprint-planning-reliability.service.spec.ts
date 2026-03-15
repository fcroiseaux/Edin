import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SprintPlanningReliabilityService } from './sprint-planning-reliability.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { SprintMetricCalculatedEvent } from '@edin/shared';

const SPRINT_ID = 'zenhub-sprint-100';
const CONTRIBUTOR_1 = 'contributor-uuid-1';
const CONTRIBUTOR_2 = 'contributor-uuid-2';
const CONTRIBUTION_1 = 'contribution-uuid-1';
const CONTRIBUTION_2 = 'contribution-uuid-2';

const mockSprintMetric = {
  id: 'metric-uuid-1',
  sprintId: SPRINT_ID,
  sprintName: 'Sprint 10',
  sprintStart: new Date('2026-03-01'),
  sprintEnd: new Date('2026-03-14'),
  domain: null,
  velocity: 20,
  committedPoints: 25,
  deliveredPoints: 20,
  contributorEstimations: [
    {
      id: 'est-uuid-1',
      sprintMetricId: 'metric-uuid-1',
      contributorId: CONTRIBUTOR_1,
      plannedPoints: 15,
      deliveredPoints: 12,
      accuracy: 80,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'est-uuid-2',
      sprintMetricId: 'metric-uuid-1',
      contributorId: CONTRIBUTOR_2,
      plannedPoints: 10,
      deliveredPoints: 8,
      accuracy: 80,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
};

const mockReliabilityRecord = {
  id: 'reliability-uuid-1',
  contributorId: CONTRIBUTOR_1,
  sprintId: SPRINT_ID,
  committedPoints: 15,
  deliveredPoints: 12,
  deliveryRatio: 0.8,
  estimationVariance: 20,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCollaborationRecord = {
  id: 'collab-uuid-1',
  sprintId: SPRINT_ID,
  epicId: null,
  domains: ['Technology', 'Finance'],
  contributorIds: [CONTRIBUTOR_1, CONTRIBUTOR_2],
  collaborationType: 'sprint',
  detectedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  sprintMetric: {
    findMany: vi.fn(),
  },
  planningReliability: {
    upsert: vi.fn(),
    findMany: vi.fn(),
  },
  contributionSprintContext: {
    findMany: vi.fn(),
  },
  contribution: {
    findMany: vi.fn(),
  },
  contributor: {
    findMany: vi.fn(),
  },
  crossDomainCollaboration: {
    upsert: vi.fn(),
    findMany: vi.fn(),
  },
};

const mockEventEmitter = {
  emit: vi.fn(),
};

describe('SprintPlanningReliabilityService', () => {
  let service: SprintPlanningReliabilityService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        SprintPlanningReliabilityService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get(SprintPlanningReliabilityService);
  });

  describe('calculateSprintReliability', () => {
    it('should compute delivery ratio and estimation variance per contributor', async () => {
      mockPrisma.sprintMetric.findMany.mockResolvedValue([mockSprintMetric]);
      mockPrisma.planningReliability.upsert.mockResolvedValue(mockReliabilityRecord);

      const result = await service.calculateSprintReliability(SPRINT_ID, 'corr-1');

      expect(result.calculated).toBe(2);
      expect(mockPrisma.planningReliability.upsert).toHaveBeenCalledTimes(2);

      // First call: contributor 1 — 12/15 = 0.8 ratio, 20% variance
      const firstCall = mockPrisma.planningReliability.upsert.mock.calls[0][0];
      expect(firstCall.where.contributorId_sprintId.contributorId).toBe(CONTRIBUTOR_1);
      expect(firstCall.create.deliveryRatio).toBeCloseTo(0.8);
      expect(firstCall.create.estimationVariance).toBeCloseTo(20);

      // Second call: contributor 2 — 8/10 = 0.8 ratio, 20% variance
      const secondCall = mockPrisma.planningReliability.upsert.mock.calls[1][0];
      expect(secondCall.where.contributorId_sprintId.contributorId).toBe(CONTRIBUTOR_2);
      expect(secondCall.create.deliveryRatio).toBeCloseTo(0.8);
      expect(secondCall.create.estimationVariance).toBeCloseTo(20);
    });

    it('should use upsert on re-run — idempotent (AC3)', async () => {
      mockPrisma.sprintMetric.findMany.mockResolvedValue([mockSprintMetric]);
      mockPrisma.planningReliability.upsert.mockResolvedValue(mockReliabilityRecord);

      await service.calculateSprintReliability(SPRINT_ID);
      vi.clearAllMocks();
      mockPrisma.sprintMetric.findMany.mockResolvedValue([mockSprintMetric]);
      mockPrisma.planningReliability.upsert.mockResolvedValue(mockReliabilityRecord);

      const result = await service.calculateSprintReliability(SPRINT_ID);

      expect(result.calculated).toBe(2);
      // Upsert called, not create — idempotent
      for (const call of mockPrisma.planningReliability.upsert.mock.calls) {
        expect(call[0]).toHaveProperty('update');
        expect(call[0]).toHaveProperty('create');
      }
    });

    it('should handle 0 committed points — deliveryRatio and variance are null', async () => {
      const metricZeroPoints = {
        ...mockSprintMetric,
        contributorEstimations: [
          {
            ...mockSprintMetric.contributorEstimations[0],
            plannedPoints: 0,
            deliveredPoints: 0,
          },
        ],
      };
      mockPrisma.sprintMetric.findMany.mockResolvedValue([metricZeroPoints]);
      mockPrisma.planningReliability.upsert.mockResolvedValue(mockReliabilityRecord);

      const result = await service.calculateSprintReliability(SPRINT_ID);

      expect(result.calculated).toBe(1);
      const call = mockPrisma.planningReliability.upsert.mock.calls[0][0];
      expect(call.create.deliveryRatio).toBeNull();
      expect(call.create.estimationVariance).toBeNull();
    });

    it('should emit sprint.planning.reliability.calculated event', async () => {
      mockPrisma.sprintMetric.findMany.mockResolvedValue([mockSprintMetric]);
      mockPrisma.planningReliability.upsert.mockResolvedValue(mockReliabilityRecord);

      await service.calculateSprintReliability(SPRINT_ID, 'corr-event');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'sprint.planning.reliability.calculated',
        expect.objectContaining({
          eventType: 'sprint.planning.reliability.calculated',
          correlationId: 'corr-event',
          payload: expect.objectContaining({
            sprintId: SPRINT_ID,
            contributorCount: 2,
          }),
        }),
      );
    });

    it('should return 0 calculated when no sprint metrics found', async () => {
      mockPrisma.sprintMetric.findMany.mockResolvedValue([]);

      const result = await service.calculateSprintReliability(SPRINT_ID);

      expect(result.calculated).toBe(0);
      expect(mockPrisma.planningReliability.upsert).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('detectCrossDomainCollaboration', () => {
    it('should record collaboration when 2+ domains in same sprint', async () => {
      mockPrisma.contributionSprintContext.findMany.mockResolvedValue([
        { contributionId: CONTRIBUTION_1, sprintId: SPRINT_ID, epicId: null },
        { contributionId: CONTRIBUTION_2, sprintId: SPRINT_ID, epicId: null },
      ]);
      mockPrisma.contribution.findMany.mockResolvedValue([
        { id: CONTRIBUTION_1, contributorId: CONTRIBUTOR_1 },
        { id: CONTRIBUTION_2, contributorId: CONTRIBUTOR_2 },
      ]);
      mockPrisma.contributor.findMany.mockResolvedValue([
        { id: CONTRIBUTOR_1, domain: 'Technology' },
        { id: CONTRIBUTOR_2, domain: 'Finance' },
      ]);
      mockPrisma.crossDomainCollaboration.upsert.mockResolvedValue(mockCollaborationRecord);

      const result = await service.detectCrossDomainCollaboration(SPRINT_ID, 'corr-detect');

      expect(result.detected).toBe(1);
      expect(mockPrisma.crossDomainCollaboration.upsert).toHaveBeenCalledTimes(1);

      const call = mockPrisma.crossDomainCollaboration.upsert.mock.calls[0][0];
      expect(call.create.domains).toEqual(['Finance', 'Technology']); // sorted
      expect(call.create.collaborationType).toBe('sprint');
    });

    it('should record collaboration when 2+ domains in same epic', async () => {
      const EPIC_ID = 'epic-42';
      mockPrisma.contributionSprintContext.findMany.mockResolvedValue([
        { contributionId: CONTRIBUTION_1, sprintId: SPRINT_ID, epicId: EPIC_ID },
        { contributionId: CONTRIBUTION_2, sprintId: SPRINT_ID, epicId: EPIC_ID },
      ]);
      mockPrisma.contribution.findMany.mockResolvedValue([
        { id: CONTRIBUTION_1, contributorId: CONTRIBUTOR_1 },
        { id: CONTRIBUTION_2, contributorId: CONTRIBUTOR_2 },
      ]);
      mockPrisma.contributor.findMany.mockResolvedValue([
        { id: CONTRIBUTOR_1, domain: 'Technology' },
        { id: CONTRIBUTOR_2, domain: 'Impact' },
      ]);
      mockPrisma.crossDomainCollaboration.upsert.mockResolvedValue(mockCollaborationRecord);

      const result = await service.detectCrossDomainCollaboration(SPRINT_ID);

      // Should detect both sprint-level and epic-level collaboration
      expect(result.detected).toBe(2);
      expect(mockPrisma.crossDomainCollaboration.upsert).toHaveBeenCalledTimes(2);

      // Verify epic-level call
      const epicCall = mockPrisma.crossDomainCollaboration.upsert.mock.calls[1][0];
      expect(epicCall.create.epicId).toBe(EPIC_ID);
      expect(epicCall.create.collaborationType).toBe('epic');
    });

    it('should use upsert — idempotent', async () => {
      mockPrisma.contributionSprintContext.findMany.mockResolvedValue([
        { contributionId: CONTRIBUTION_1, sprintId: SPRINT_ID, epicId: null },
        { contributionId: CONTRIBUTION_2, sprintId: SPRINT_ID, epicId: null },
      ]);
      mockPrisma.contribution.findMany.mockResolvedValue([
        { id: CONTRIBUTION_1, contributorId: CONTRIBUTOR_1 },
        { id: CONTRIBUTION_2, contributorId: CONTRIBUTOR_2 },
      ]);
      mockPrisma.contributor.findMany.mockResolvedValue([
        { id: CONTRIBUTOR_1, domain: 'Technology' },
        { id: CONTRIBUTOR_2, domain: 'Governance' },
      ]);
      mockPrisma.crossDomainCollaboration.upsert.mockResolvedValue(mockCollaborationRecord);

      await service.detectCrossDomainCollaboration(SPRINT_ID);

      const call = mockPrisma.crossDomainCollaboration.upsert.mock.calls[0][0];
      expect(call).toHaveProperty('update');
      expect(call).toHaveProperty('create');
    });

    it('should skip contributors with no domain set', async () => {
      mockPrisma.contributionSprintContext.findMany.mockResolvedValue([
        { contributionId: CONTRIBUTION_1, sprintId: SPRINT_ID, epicId: null },
        { contributionId: CONTRIBUTION_2, sprintId: SPRINT_ID, epicId: null },
      ]);
      mockPrisma.contribution.findMany.mockResolvedValue([
        { id: CONTRIBUTION_1, contributorId: CONTRIBUTOR_1 },
        { id: CONTRIBUTION_2, contributorId: CONTRIBUTOR_2 },
      ]);
      mockPrisma.contributor.findMany.mockResolvedValue([
        { id: CONTRIBUTOR_1, domain: 'Technology' },
        { id: CONTRIBUTOR_2, domain: null }, // No domain
      ]);
      mockPrisma.crossDomainCollaboration.upsert.mockResolvedValue(mockCollaborationRecord);

      const result = await service.detectCrossDomainCollaboration(SPRINT_ID);

      // Only 1 domain (Technology), so no cross-domain detected
      expect(result.detected).toBe(0);
      expect(mockPrisma.crossDomainCollaboration.upsert).not.toHaveBeenCalled();
    });

    it('should emit sprint.collaboration.detected event', async () => {
      mockPrisma.contributionSprintContext.findMany.mockResolvedValue([
        { contributionId: CONTRIBUTION_1, sprintId: SPRINT_ID, epicId: null },
        { contributionId: CONTRIBUTION_2, sprintId: SPRINT_ID, epicId: null },
      ]);
      mockPrisma.contribution.findMany.mockResolvedValue([
        { id: CONTRIBUTION_1, contributorId: CONTRIBUTOR_1 },
        { id: CONTRIBUTION_2, contributorId: CONTRIBUTOR_2 },
      ]);
      mockPrisma.contributor.findMany.mockResolvedValue([
        { id: CONTRIBUTOR_1, domain: 'Technology' },
        { id: CONTRIBUTOR_2, domain: 'Finance' },
      ]);
      mockPrisma.crossDomainCollaboration.upsert.mockResolvedValue(mockCollaborationRecord);

      await service.detectCrossDomainCollaboration(SPRINT_ID, 'corr-detect-event');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'sprint.collaboration.detected',
        expect.objectContaining({
          eventType: 'sprint.collaboration.detected',
          correlationId: 'corr-detect-event',
          payload: expect.objectContaining({
            sprintId: SPRINT_ID,
            epicId: null,
            domains: ['Finance', 'Technology'],
          }),
        }),
      );
    });

    it('should return 0 when no contribution contexts exist', async () => {
      mockPrisma.contributionSprintContext.findMany.mockResolvedValue([]);

      const result = await service.detectCrossDomainCollaboration(SPRINT_ID);

      expect(result.detected).toBe(0);
    });
  });

  describe('handleMetricsRecalculated', () => {
    it('should trigger reliability and collaboration detection on metrics recalculation', async () => {
      const event: SprintMetricCalculatedEvent = {
        eventType: 'sprint.metrics.recalculated',
        timestamp: new Date().toISOString(),
        correlationId: 'recalc-corr',
        payload: {
          sprintId: SPRINT_ID,
          sprintName: 'Sprint 10',
          metricType: 'all',
          value: null,
        },
      };

      // calculateSprintReliability dependencies
      mockPrisma.sprintMetric.findMany.mockResolvedValue([mockSprintMetric]);
      mockPrisma.planningReliability.upsert.mockResolvedValue(mockReliabilityRecord);

      // detectCrossDomainCollaboration dependencies
      mockPrisma.contributionSprintContext.findMany.mockResolvedValue([]);

      await service.handleMetricsRecalculated(event);

      // Should have called sprint metric lookup for reliability
      expect(mockPrisma.sprintMetric.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { sprintId: SPRINT_ID } }),
      );
      // Should have called contribution context lookup for collaboration
      expect(mockPrisma.contributionSprintContext.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { sprintId: SPRINT_ID } }),
      );
    });
  });

  describe('getContributorReliability', () => {
    it('should return sorted reliability records for a contributor', async () => {
      const records = [
        { ...mockReliabilityRecord, sprintId: 'sprint-2' },
        { ...mockReliabilityRecord, id: 'rel-2', sprintId: 'sprint-1' },
      ];
      mockPrisma.planningReliability.findMany.mockResolvedValue(records);

      const result = await service.getContributorReliability(CONTRIBUTOR_1);

      expect(result).toHaveLength(2);
      expect(result[0].contributorId).toBe(CONTRIBUTOR_1);
      expect(mockPrisma.planningReliability.findMany).toHaveBeenCalledWith({
        where: { contributorId: CONTRIBUTOR_1 },
        orderBy: { createdAt: 'desc' },
        take: 12,
      });
    });
  });

  describe('getReliabilitySummary', () => {
    it('should return aggregated per-contributor summaries with trends', async () => {
      mockPrisma.planningReliability.findMany.mockResolvedValue([
        mockReliabilityRecord,
        {
          ...mockReliabilityRecord,
          id: 'rel-2',
          sprintId: 'sprint-2',
          deliveryRatio: 0.9,
          estimationVariance: 10,
        },
      ]);
      mockPrisma.contributor.findMany.mockResolvedValue([
        { id: CONTRIBUTOR_1, name: 'Alice', domain: 'Technology', githubUsername: 'alice' },
      ]);
      mockPrisma.sprintMetric.findMany.mockResolvedValue([
        { sprintId: SPRINT_ID, sprintName: 'Sprint 10', sprintEnd: new Date('2026-03-14') },
        { sprintId: 'sprint-2', sprintName: 'Sprint 11', sprintEnd: new Date('2026-03-28') },
      ]);

      const result = await service.getReliabilitySummary();

      expect(result).toHaveLength(1);
      expect(result[0].contributorId).toBe(CONTRIBUTOR_1);
      expect(result[0].contributorName).toBe('Alice');
      expect(result[0].sprintCount).toBe(2);
      expect(result[0].averageDeliveryRatio).toBeCloseTo(0.85);
      expect(result[0].averageEstimationVariance).toBeCloseTo(15);
      expect(result[0].trend).toHaveLength(2);
    });

    it('should filter by domain', async () => {
      mockPrisma.planningReliability.findMany.mockResolvedValue([
        { ...mockReliabilityRecord, contributorId: CONTRIBUTOR_1 },
        { ...mockReliabilityRecord, id: 'rel-3', contributorId: CONTRIBUTOR_2 },
      ]);
      mockPrisma.contributor.findMany.mockResolvedValue([
        { id: CONTRIBUTOR_1, name: 'Alice', domain: 'Technology', githubUsername: 'alice' },
        { id: CONTRIBUTOR_2, name: 'Bob', domain: 'Finance', githubUsername: 'bob' },
      ]);
      mockPrisma.sprintMetric.findMany.mockResolvedValue([
        { sprintId: SPRINT_ID, sprintName: 'Sprint 10', sprintEnd: new Date() },
      ]);

      const result = await service.getReliabilitySummary({ domain: 'Technology' });

      expect(result).toHaveLength(1);
      expect(result[0].contributorId).toBe(CONTRIBUTOR_1);
    });
  });

  describe('getCollaborations', () => {
    it('should return collaboration records filtered by sprint', async () => {
      mockPrisma.crossDomainCollaboration.findMany.mockResolvedValue([mockCollaborationRecord]);

      const result = await service.getCollaborations({ sprintId: SPRINT_ID });

      expect(result).toHaveLength(1);
      expect(result[0].domains).toEqual(['Technology', 'Finance']);
      expect(mockPrisma.crossDomainCollaboration.findMany).toHaveBeenCalledWith({
        where: { sprintId: SPRINT_ID },
        orderBy: { detectedAt: 'desc' },
        take: 20,
      });
    });
  });

  describe('getCollaborationSummary', () => {
    it('should return total count and domain pair aggregation', async () => {
      mockPrisma.crossDomainCollaboration.findMany.mockResolvedValue([
        mockCollaborationRecord,
        { ...mockCollaborationRecord, id: 'collab-2', sprintId: 'sprint-2' },
        {
          ...mockCollaborationRecord,
          id: 'collab-3',
          sprintId: 'sprint-3',
          domains: ['Technology', 'Impact'],
          contributorIds: [CONTRIBUTOR_1, 'contributor-3'],
        },
      ]);

      const result = await service.getCollaborationSummary();

      expect(result.totalCollaborations).toBe(3);
      expect(result.domainPairs).toHaveLength(2);
      // Finance,Technology appears twice
      expect(result.domainPairs[0].domains).toEqual(['Finance', 'Technology']);
      expect(result.domainPairs[0].count).toBe(2);
      // Impact,Technology appears once
      expect(result.domainPairs[1].domains).toEqual(['Impact', 'Technology']);
      expect(result.domainPairs[1].count).toBe(1);
      expect(result.recentCollaborations).toHaveLength(3);
    });
  });
});

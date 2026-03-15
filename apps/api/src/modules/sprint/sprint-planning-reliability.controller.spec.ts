import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { SprintPlanningReliabilityController } from './sprint-planning-reliability.controller.js';
import { SprintPlanningReliabilityService } from './sprint-planning-reliability.service.js';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

const CONTRIBUTOR_ID = 'contrib-uuid-aaaa-bbbb-ccccdddd1111';
const SPRINT_ID = 'zenhub-sprint-100';

const mockReliabilitySummary = {
  contributorId: CONTRIBUTOR_ID,
  contributorName: 'Alice',
  githubUsername: 'alice',
  domain: 'Technology',
  sprintCount: 3,
  averageDeliveryRatio: 0.85,
  averageEstimationVariance: 15,
  trend: [],
};

const mockReliabilityRecord = {
  id: 'rel-uuid-1',
  contributorId: CONTRIBUTOR_ID,
  sprintId: SPRINT_ID,
  committedPoints: 15,
  deliveredPoints: 12,
  deliveryRatio: 0.8,
  estimationVariance: 20,
  createdAt: '2026-03-15T00:00:00.000Z',
  updatedAt: '2026-03-15T00:00:00.000Z',
};

const mockCollaboration = {
  id: 'collab-uuid-1',
  sprintId: SPRINT_ID,
  epicId: null,
  domains: ['Technology', 'Finance'],
  contributorIds: [CONTRIBUTOR_ID],
  collaborationType: 'sprint',
  detectedAt: '2026-03-15T00:00:00.000Z',
};

const mockCollabSummary = {
  totalCollaborations: 5,
  domainPairs: [{ domains: ['Technology', 'Finance'], count: 3 }],
  recentCollaborations: [mockCollaboration],
};

const mockReliabilityService = {
  getReliabilitySummary: vi.fn(),
  getContributorReliability: vi.fn(),
  getCollaborations: vi.fn(),
  getCollaborationSummary: vi.fn(),
};

describe('SprintPlanningReliabilityController', () => {
  let controller: SprintPlanningReliabilityController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [SprintPlanningReliabilityController],
      providers: [
        { provide: SprintPlanningReliabilityService, useValue: mockReliabilityService },
        CaslAbilityFactory,
        Reflector,
        AbilityGuard,
        JwtAuthGuard,
      ],
    }).compile();

    controller = module.get(SprintPlanningReliabilityController);
  });

  describe('getReliabilitySummary', () => {
    it('should return reliability summary array', async () => {
      mockReliabilityService.getReliabilitySummary.mockResolvedValue([mockReliabilitySummary]);

      const result = await controller.getReliabilitySummary({ limit: '12' }, {
        correlationId: 'corr-1',
      } as never);

      expect(result.data).toEqual([mockReliabilitySummary]);
      expect(mockReliabilityService.getReliabilitySummary).toHaveBeenCalledWith({
        domain: undefined,
        limit: 12,
      });
    });

    it('should pass domain filter to service', async () => {
      mockReliabilityService.getReliabilitySummary.mockResolvedValue([]);

      await controller.getReliabilitySummary({ domain: 'Technology', limit: '5' }, {
        correlationId: 'corr-2',
      } as never);

      expect(mockReliabilityService.getReliabilitySummary).toHaveBeenCalledWith({
        domain: 'Technology',
        limit: 5,
      });
    });
  });

  describe('getContributorReliability', () => {
    it('should return contributor-specific reliability', async () => {
      mockReliabilityService.getContributorReliability.mockResolvedValue([mockReliabilityRecord]);

      const result = await controller.getContributorReliability(CONTRIBUTOR_ID, undefined, {
        correlationId: 'corr-3',
      } as never);

      expect(result.data).toEqual([mockReliabilityRecord]);
      expect(mockReliabilityService.getContributorReliability).toHaveBeenCalledWith(
        CONTRIBUTOR_ID,
        undefined,
      );
    });

    it('should throw on invalid contributor ID', async () => {
      await expect(
        controller.getContributorReliability('short', undefined, undefined),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('getCollaborations', () => {
    it('should return collaboration list', async () => {
      mockReliabilityService.getCollaborations.mockResolvedValue([mockCollaboration]);

      const result = await controller.getCollaborations({ limit: '20' }, {
        correlationId: 'corr-4',
      } as never);

      expect(result.data).toEqual([mockCollaboration]);
    });

    it('should filter by sprintId', async () => {
      mockReliabilityService.getCollaborations.mockResolvedValue([mockCollaboration]);

      await controller.getCollaborations({ sprintId: SPRINT_ID }, {
        correlationId: 'corr-5',
      } as never);

      expect(mockReliabilityService.getCollaborations).toHaveBeenCalledWith({
        sprintId: SPRINT_ID,
        limit: 20,
      });
    });
  });

  describe('getCollaborationSummary', () => {
    it('should return collaboration summary', async () => {
      mockReliabilityService.getCollaborationSummary.mockResolvedValue(mockCollabSummary);

      const result = await controller.getCollaborationSummary({ correlationId: 'corr-6' } as never);

      expect(result.data).toEqual(mockCollabSummary);
      expect(result.data.totalCollaborations).toBe(5);
    });
  });
});

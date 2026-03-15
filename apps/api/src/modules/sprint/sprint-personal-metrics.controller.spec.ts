import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { SprintPersonalMetricsController } from './sprint-personal-metrics.controller.js';
import { SprintMetricsService } from './sprint-metrics.service.js';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import type { PersonalSprintMetrics } from '@edin/shared';

const CONTRIBUTOR_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const OTHER_CONTRIBUTOR_ID = '11111111-2222-3333-4444-555555555555';

const mockPersonalMetrics: PersonalSprintMetrics = {
  contributorId: CONTRIBUTOR_ID,
  contributorName: 'Alice',
  domain: 'Technology',
  velocity: [
    {
      sprintId: 'sprint-1',
      sprintName: 'Sprint 1',
      sprintEnd: '2026-03-01',
      deliveredPoints: 8,
    },
    {
      sprintId: 'sprint-2',
      sprintName: 'Sprint 2',
      sprintEnd: '2026-03-15',
      deliveredPoints: 13,
    },
  ],
  estimationAccuracy: [
    {
      sprintId: 'sprint-1',
      sprintName: 'Sprint 1',
      sprintEnd: '2026-03-01',
      plannedPoints: 10,
      deliveredPoints: 8,
      accuracy: 80,
    },
    {
      sprintId: 'sprint-2',
      sprintName: 'Sprint 2',
      sprintEnd: '2026-03-15',
      plannedPoints: 13,
      deliveredPoints: 13,
      accuracy: 100,
    },
  ],
  planningReliability: {
    averageDeliveryRatio: 0.9,
    averageEstimationVariance: 15,
    trend: [
      {
        sprintId: 'sprint-1',
        sprintName: 'Sprint 1',
        sprintEnd: '2026-03-01',
        deliveryRatio: 0.8,
        estimationVariance: 20,
      },
      {
        sprintId: 'sprint-2',
        sprintName: 'Sprint 2',
        sprintEnd: '2026-03-15',
        deliveryRatio: 1.0,
        estimationVariance: 0,
      },
    ],
  },
  summary: {
    totalSprints: 2,
    totalDeliveredPoints: 21,
    averageVelocity: 10.5,
    averageAccuracy: 90,
  },
};

const mockSprintMetricsService = {
  getPersonalMetrics: vi.fn(),
};

describe('SprintPersonalMetricsController', () => {
  let controller: SprintPersonalMetricsController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [SprintPersonalMetricsController],
      providers: [
        { provide: SprintMetricsService, useValue: mockSprintMetricsService },
        CaslAbilityFactory,
        Reflector,
        AbilityGuard,
        JwtAuthGuard,
      ],
    }).compile();

    controller = module.get(SprintPersonalMetricsController);
  });

  describe('getPersonalMetrics', () => {
    it('should return personal metrics for the requesting contributor', async () => {
      mockSprintMetricsService.getPersonalMetrics.mockResolvedValue(mockPersonalMetrics);

      // No ability on req simulates an admin/lead (no field constraint)
      const result = await controller.getPersonalMetrics(CONTRIBUTOR_ID, CONTRIBUTOR_ID, {
        correlationId: 'corr-1',
      } as never);

      expect(result.data).toEqual(mockPersonalMetrics);
      expect(mockSprintMetricsService.getPersonalMetrics).toHaveBeenCalledWith(CONTRIBUTOR_ID);
    });

    it('should return empty metrics when contributor has no sprint history', async () => {
      const emptyMetrics: PersonalSprintMetrics = {
        contributorId: CONTRIBUTOR_ID,
        contributorName: 'Alice',
        domain: 'Technology',
        velocity: [],
        estimationAccuracy: [],
        planningReliability: {
          averageDeliveryRatio: null,
          averageEstimationVariance: null,
          trend: [],
        },
        summary: {
          totalSprints: 0,
          totalDeliveredPoints: 0,
          averageVelocity: null,
          averageAccuracy: null,
        },
      };
      mockSprintMetricsService.getPersonalMetrics.mockResolvedValue(emptyMetrics);

      const result = await controller.getPersonalMetrics(CONTRIBUTOR_ID, CONTRIBUTOR_ID, {
        correlationId: 'corr-2',
      } as never);

      expect(result.data.velocity).toEqual([]);
      expect(result.data.summary.totalSprints).toBe(0);
    });

    it('should reject requests with a CASL ability that blocks access to another contributor', async () => {
      const mockAbility = {
        can: vi.fn().mockReturnValue(false),
      };

      await expect(
        controller.getPersonalMetrics(OTHER_CONTRIBUTOR_ID, CONTRIBUTOR_ID, {
          correlationId: 'corr-3',
          ability: mockAbility,
        } as never),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow access when CASL ability permits it (admin/lead)', async () => {
      mockSprintMetricsService.getPersonalMetrics.mockResolvedValue(mockPersonalMetrics);

      const mockAbility = {
        can: vi.fn().mockReturnValue(true),
      };

      const result = await controller.getPersonalMetrics(CONTRIBUTOR_ID, CONTRIBUTOR_ID, {
        correlationId: 'corr-4',
        ability: mockAbility,
      } as never);

      expect(result.data).toEqual(mockPersonalMetrics);
    });

    it('should throw on invalid contributor ID', async () => {
      await expect(
        controller.getPersonalMetrics('short', CONTRIBUTOR_ID, undefined),
      ).rejects.toThrow(DomainException);
    });
  });
});

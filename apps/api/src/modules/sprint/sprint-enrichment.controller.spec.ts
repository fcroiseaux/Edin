import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { SprintEnrichmentController } from './sprint-enrichment.controller.js';
import { SprintEnrichmentService } from './sprint-enrichment.service.js';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

const CONTRIBUTION_ID = 'contrib-uuid-aaaa-bbbb-ccccdddd1111';
const SPRINT_ID = 'zenhub-sprint-123';

const mockContextDto = {
  id: 'context-uuid-1',
  contributionId: CONTRIBUTION_ID,
  sprintId: SPRINT_ID,
  storyPoints: 5,
  zenhubIssueId: 'zh-issue-456',
  epicId: 'epic-1',
  pipelineStatus: 'Done',
  createdAt: '2026-03-15T00:00:00.000Z',
  updatedAt: '2026-03-15T00:00:00.000Z',
};

const mockEnrichmentService = {
  getContributionSprintContexts: vi.fn(),
  getSprintContributions: vi.fn(),
};

describe('SprintEnrichmentController', () => {
  let controller: SprintEnrichmentController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [SprintEnrichmentController],
      providers: [
        { provide: SprintEnrichmentService, useValue: mockEnrichmentService },
        CaslAbilityFactory,
        Reflector,
        AbilityGuard,
        JwtAuthGuard,
      ],
    }).compile();

    controller = module.get(SprintEnrichmentController);
  });

  describe('getContributionSprintContext', () => {
    it('should return sprint contexts for a contribution', async () => {
      mockEnrichmentService.getContributionSprintContexts.mockResolvedValue([mockContextDto]);

      const result = await controller.getContributionSprintContext(CONTRIBUTION_ID, {
        correlationId: 'corr-1',
      } as never);

      expect(result.data).toEqual([mockContextDto]);
      expect(mockEnrichmentService.getContributionSprintContexts).toHaveBeenCalledWith(
        CONTRIBUTION_ID,
      );
    });

    it('should return empty array when no contexts exist', async () => {
      mockEnrichmentService.getContributionSprintContexts.mockResolvedValue([]);

      const result = await controller.getContributionSprintContext(CONTRIBUTION_ID, {
        correlationId: 'corr-2',
      } as never);

      expect(result.data).toEqual([]);
    });

    it('should throw on invalid contribution ID', async () => {
      await expect(controller.getContributionSprintContext('short', undefined)).rejects.toThrow(
        DomainException,
      );
    });
  });

  describe('getSprintContributions', () => {
    it('should return all contexts for a sprint', async () => {
      mockEnrichmentService.getSprintContributions.mockResolvedValue([mockContextDto]);

      const result = await controller.getSprintContributions(SPRINT_ID, {
        correlationId: 'corr-3',
      } as never);

      expect(result.data).toEqual([mockContextDto]);
      expect(mockEnrichmentService.getSprintContributions).toHaveBeenCalledWith(SPRINT_ID);
    });

    it('should throw on empty sprint ID', async () => {
      await expect(controller.getSprintContributions('', undefined)).rejects.toThrow(
        DomainException,
      );
    });
  });
});

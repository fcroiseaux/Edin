import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { EvaluationPublicController } from './evaluation-public.controller.js';
import { EvaluationService } from '../evaluation.service.js';
import type { PublicEvaluationAggregateDto } from '@edin/shared';

const mockAggregate: PublicEvaluationAggregateDto = {
  totalEvaluations: 42,
  averageScore: 67.5,
  byDomain: [
    { domain: 'Technology', averageScore: 72.3, count: 20 },
    { domain: 'Fintech', averageScore: 63.1, count: 12 },
  ],
  scoreDistribution: [
    { range: '0–20', min: 0, max: 20, count: 2 },
    { range: '21–40', min: 21, max: 40, count: 5 },
    { range: '41–60', min: 41, max: 60, count: 12 },
    { range: '61–80', min: 61, max: 80, count: 18 },
    { range: '81–100', min: 81, max: 100, count: 5 },
  ],
  agreementRate: { overall: 78, totalReviewed: 9 },
};

const mockEvaluationService = {
  getPublicEvaluationAggregate: vi.fn().mockResolvedValue(mockAggregate),
  getContributorPublicScores: vi.fn(),
};

describe('EvaluationPublicController', () => {
  let controller: EvaluationPublicController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvaluationPublicController],
      providers: [{ provide: EvaluationService, useValue: mockEvaluationService }],
    }).compile();

    controller = module.get(EvaluationPublicController);
    vi.clearAllMocks();
    mockEvaluationService.getPublicEvaluationAggregate.mockResolvedValue(mockAggregate);
  });

  describe('GET /aggregate', () => {
    it('should return aggregate evaluation data without authentication', async () => {
      const mockRes = { setHeader: vi.fn() } as unknown as import('express').Response;
      const result = await controller.getPublicAggregate(mockRes);

      expect(result.data).toEqual(mockAggregate);
      expect(result.meta.correlationId).toBeDefined();
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'public, max-age=300, s-maxage=300',
      );
    });

    it('should call evaluation service for aggregate', async () => {
      const mockRes = { setHeader: vi.fn() } as unknown as import('express').Response;
      await controller.getPublicAggregate(mockRes);

      expect(mockEvaluationService.getPublicEvaluationAggregate).toHaveBeenCalledOnce();
    });
  });

  describe('GET /contributor/:id', () => {
    it('should return contributor scores when consented', async () => {
      const scores = {
        contributorId: 'c-1',
        averageScore: 75,
        evaluationCount: 5,
        narrative: 'This contributor...',
        recentScores: [],
      };
      mockEvaluationService.getContributorPublicScores.mockResolvedValue(scores);

      const result = await controller.getContributorPublicScores('c-1');
      expect(result.data).toEqual(scores);
      expect(mockEvaluationService.getContributorPublicScores).toHaveBeenCalledWith('c-1');
    });

    it('should return null data when contributor has not consented', async () => {
      mockEvaluationService.getContributorPublicScores.mockResolvedValue(null);

      const result = await controller.getContributorPublicScores('c-2');
      expect(result.data).toBeNull();
    });
  });
});

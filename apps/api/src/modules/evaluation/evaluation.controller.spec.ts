import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { EvaluationController } from './evaluation.controller.js';
import { EvaluationService } from './evaluation.service.js';

const mockEvaluationService = {
  getEvaluation: vi.fn(),
  getEvaluationByContribution: vi.fn(),
  getEvaluationsForContributor: vi.fn(),
  getEvaluationStatus: vi.fn(),
  getEvaluationHistory: vi.fn(),
};

const user = {
  id: 'user-1',
  githubId: 1,
  name: 'Test User',
  email: 'test@test.com',
  avatarUrl: null,
  role: 'CONTRIBUTOR',
};

const adminUser = {
  ...user,
  id: 'admin-1',
  role: 'ADMIN',
};

describe('EvaluationController', () => {
  let controller: EvaluationController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [EvaluationController],
      providers: [{ provide: EvaluationService, useValue: mockEvaluationService }],
    }).compile();

    controller = module.get(EvaluationController);
  });

  describe('GET /:id', () => {
    it('returns evaluation for owner', async () => {
      mockEvaluationService.getEvaluation.mockResolvedValue({
        id: 'eval-1',
        contributorId: 'user-1',
        compositeScore: 80,
        contribution: { title: 'Fix bug' },
      });

      const result = await controller.getEvaluation(user, 'eval-1');

      expect(result.data.id).toBe('eval-1');
    });

    it('returns 404 for missing evaluation', async () => {
      mockEvaluationService.getEvaluation.mockRejectedValue(new Error('Evaluation not found'));

      await expect(controller.getEvaluation(user, 'nonexistent')).rejects.toThrow();
    });

    it('returns 403 for non-owner', async () => {
      mockEvaluationService.getEvaluation.mockResolvedValue({
        id: 'eval-1',
        contributorId: 'other-user',
        compositeScore: 80,
      });

      await expect(controller.getEvaluation(user, 'eval-1')).rejects.toThrow(
        'You can only view your own evaluations',
      );
    });

    it('allows admin to view any evaluation', async () => {
      mockEvaluationService.getEvaluation.mockResolvedValue({
        id: 'eval-1',
        contributorId: 'other-user',
        compositeScore: 80,
        contribution: { title: 'Fix bug' },
      });

      const result = await controller.getEvaluation(adminUser, 'eval-1');
      expect(result.data.id).toBe('eval-1');
    });
  });

  describe('GET /', () => {
    it('returns paginated evaluations for current user', async () => {
      mockEvaluationService.getEvaluationsForContributor.mockResolvedValue({
        items: [{ id: 'eval-1', contributorId: 'user-1' }],
        pagination: { cursor: null, hasMore: false, total: 1 },
      });

      const result = await controller.getMyEvaluations(user, { limit: '20' });

      expect(result.data).toHaveLength(1);
      expect(mockEvaluationService.getEvaluationsForContributor).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ limit: 20 }),
      );
    });
  });

  describe('GET /contribution/:id', () => {
    it('returns evaluation by contribution', async () => {
      mockEvaluationService.getEvaluationByContribution.mockResolvedValue({
        id: 'eval-1',
        contributorId: 'user-1',
        compositeScore: 85,
      });

      const result = await controller.getEvaluationByContribution(user, 'contrib-1');
      expect(result.data.compositeScore).toBe(85);
    });
  });

  describe('GET /history', () => {
    it('returns paginated evaluation history for current user', async () => {
      mockEvaluationService.getEvaluationHistory.mockResolvedValue({
        items: [
          {
            id: 'eval-1',
            compositeScore: 82,
            contributionType: 'COMMIT',
            contributionTitle: 'Refactor auth',
            narrativePreview: 'Your refactoring improved code clarity.',
            completedAt: '2026-03-01T12:00:00.000Z',
          },
        ],
        pagination: { cursor: null, hasMore: false, total: 1 },
      });

      const result = await controller.getEvaluationHistory(user, { limit: '20' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].narrativePreview).toBe('Your refactoring improved code clarity.');
      expect(mockEvaluationService.getEvaluationHistory).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ limit: 20 }),
      );
    });

    it('rejects invalid query parameters', async () => {
      await expect(controller.getEvaluationHistory(user, { limit: 'abc' })).rejects.toThrow(
        'Invalid query parameters',
      );
    });
  });

  describe('GET /contribution/:id/status', () => {
    it('returns lightweight status for owner', async () => {
      mockEvaluationService.getEvaluationStatus.mockResolvedValue({
        status: 'COMPLETED',
        contributorId: 'user-1',
      });

      const result = await controller.getEvaluationStatus(user, 'contrib-1');
      expect(result.data.status).toBe('COMPLETED');
    });

    it('returns null when no evaluation exists', async () => {
      mockEvaluationService.getEvaluationStatus.mockResolvedValue(null);

      const result = await controller.getEvaluationStatus(user, 'contrib-1');
      expect(result.data.status).toBeNull();
    });

    it('returns 403 for non-owner', async () => {
      mockEvaluationService.getEvaluationStatus.mockResolvedValue({
        status: 'COMPLETED',
        contributorId: 'other-user',
      });

      await expect(controller.getEvaluationStatus(user, 'contrib-1')).rejects.toThrow(
        'You can only view your own evaluations',
      );
    });

    it('allows admin to view any status', async () => {
      mockEvaluationService.getEvaluationStatus.mockResolvedValue({
        status: 'IN_PROGRESS',
        contributorId: 'other-user',
      });

      const result = await controller.getEvaluationStatus(adminUser, 'contrib-1');
      expect(result.data.status).toBe('IN_PROGRESS');
    });
  });
});

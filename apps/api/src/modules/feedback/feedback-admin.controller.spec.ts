import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { FeedbackAdminController } from './feedback-admin.controller.js';
import { FeedbackService } from './feedback.service.js';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';

const mockFeedbackService = {
  adminAssignReviewer: vi.fn(),
};

describe('FeedbackAdminController', () => {
  let controller: FeedbackAdminController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [FeedbackAdminController],
      providers: [{ provide: FeedbackService, useValue: mockFeedbackService }, CaslAbilityFactory],
    }).compile();

    controller = module.get(FeedbackAdminController);
  });

  describe('POST /admin/feedback/assign', () => {
    it('creates assignment (admin only)', async () => {
      mockFeedbackService.adminAssignReviewer.mockResolvedValue({
        peerFeedbackId: 'pf-1',
        reviewerId: 'reviewer-1',
      });

      const user = {
        id: 'admin-1',
        githubId: 1,
        name: 'Admin',
        email: 'admin@test.com',
        avatarUrl: null,
        role: 'ADMIN',
      };
      const body = {
        contributionId: '550e8400-e29b-41d4-a716-446655440000',
        reviewerId: '550e8400-e29b-41d4-a716-446655440001',
      };
      const result = await controller.adminAssign(user, body);

      expect(result.data).toEqual({
        peerFeedbackId: 'pf-1',
        reviewerId: 'reviewer-1',
      });
      expect(mockFeedbackService.adminAssignReviewer).toHaveBeenCalledWith(
        body.contributionId,
        body.reviewerId,
        'admin-1',
        expect.any(String),
      );
    });
  });

  describe('guard verification', () => {
    it('controller class uses JwtAuthGuard and AbilityGuard decorators', () => {
      const guards = Reflect.getMetadata('__guards__', FeedbackAdminController);
      expect(guards).toBeDefined();
      expect(guards).toHaveLength(2);
    });
  });
});

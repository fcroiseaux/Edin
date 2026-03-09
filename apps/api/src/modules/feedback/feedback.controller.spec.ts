import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { FeedbackController } from './feedback.controller.js';
import { FeedbackService } from './feedback.service.js';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

const REVIEWER_ID = '00000000-0000-0000-0000-000000000001';
const ADMIN_ID = '00000000-0000-0000-0000-000000000099';
const CONTRIB_ID = '00000000-0000-0000-0000-000000000010';
const FEEDBACK_ID = '00000000-0000-0000-0000-000000000020';

const mockFeedbackService = {
  getAssignmentsForReviewer: vi.fn(),
  getAssignmentsForContribution: vi.fn(),
  submitFeedback: vi.fn(),
  getAssignmentById: vi.fn(),
  getReceivedFeedback: vi.fn(),
};

const contributorUser = {
  id: REVIEWER_ID,
  githubId: 1,
  name: 'Test',
  email: 'test@test.com',
  avatarUrl: null,
  role: 'CONTRIBUTOR',
};

const adminUser = {
  id: ADMIN_ID,
  githubId: 2,
  name: 'Admin',
  email: 'admin@test.com',
  avatarUrl: null,
  role: 'ADMIN',
};

describe('FeedbackController', () => {
  let controller: FeedbackController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [FeedbackController],
      providers: [{ provide: FeedbackService, useValue: mockFeedbackService }, CaslAbilityFactory],
    }).compile();

    controller = module.get(FeedbackController);
  });

  describe('GET /assignments', () => {
    it('returns reviewer assignments', async () => {
      const items = [
        {
          id: FEEDBACK_ID,
          contributionId: CONTRIB_ID,
          reviewerId: REVIEWER_ID,
          status: 'ASSIGNED',
          assignedAt: '2026-03-08T10:00:00Z',
          submittedAt: null,
          contributionTitle: 'Fix bug',
          contributionType: 'COMMIT',
        },
      ];
      mockFeedbackService.getAssignmentsForReviewer.mockResolvedValue({
        items,
        pagination: { cursor: null, hasMore: false, total: 1 },
      });

      const result = await controller.getAssignments(contributorUser, { limit: '20' });

      expect(result.data).toEqual(items);
      expect(mockFeedbackService.getAssignmentsForReviewer).toHaveBeenCalledWith(
        REVIEWER_ID,
        expect.objectContaining({ limit: 20 }),
      );
    });
  });

  describe('GET /assignments/:id', () => {
    it('returns enriched feedback with contribution context', async () => {
      const assignment = {
        id: FEEDBACK_ID,
        contributionId: CONTRIB_ID,
        reviewerId: REVIEWER_ID,
        status: 'ASSIGNED',
        ratings: null,
        comments: null,
        assignedAt: '2026-03-08T10:00:00Z',
        submittedAt: null,
        contribution: {
          id: CONTRIB_ID,
          title: 'Fix auth bug',
          description: 'Fixes OAuth flow',
          contributionType: 'COMMIT',
        },
        contributorName: 'Alice',
        contributorDomain: 'Technology',
      };
      mockFeedbackService.getAssignmentById.mockResolvedValue(assignment);

      const result = await controller.getAssignmentById(contributorUser, FEEDBACK_ID);

      expect(result.data).toEqual(assignment);
      expect(mockFeedbackService.getAssignmentById).toHaveBeenCalledWith(FEEDBACK_ID, REVIEWER_ID);
    });

    it('rejects invalid UUID param', async () => {
      await expect(controller.getAssignmentById(contributorUser, 'not-a-uuid')).rejects.toThrow(
        DomainException,
      );

      expect(mockFeedbackService.getAssignmentById).not.toHaveBeenCalled();
    });
  });

  describe('GET /received', () => {
    it('returns paginated received feedback', async () => {
      const items = [
        {
          id: FEEDBACK_ID,
          contributionId: CONTRIB_ID,
          reviewerId: REVIEWER_ID,
          status: 'COMPLETED',
          ratings: { rubricVersion: '1.0', responses: [] },
          comments: 'Good work',
          submittedAt: '2026-03-08T12:00:00Z',
          contribution: { id: CONTRIB_ID, title: 'Fix auth', contributionType: 'COMMIT' },
          reviewer: { id: REVIEWER_ID, name: 'Bob', avatarUrl: null, domain: 'Technology' },
        },
      ];
      mockFeedbackService.getReceivedFeedback.mockResolvedValue({
        items,
        pagination: { cursor: null, hasMore: false, total: 1 },
      });

      const result = await controller.getReceivedFeedback(contributorUser, { limit: '20' });

      expect(result.data).toEqual(items);
      expect(mockFeedbackService.getReceivedFeedback).toHaveBeenCalledWith(
        REVIEWER_ID,
        expect.objectContaining({ limit: 20 }),
      );
    });
  });

  describe('POST /:id/submit', () => {
    const validBody = {
      responses: [
        {
          questionId: 'code-quality',
          rating: 4,
          comment: 'Great code quality and readability throughout the PR',
        },
        {
          questionId: 'technical-approach',
          rating: 3,
          comment: 'The approach works but could be improved slightly',
        },
      ],
      overallComment: 'Good work overall',
    };

    it('validates body and calls service', async () => {
      const updated = {
        id: FEEDBACK_ID,
        status: 'COMPLETED',
        submittedAt: '2026-03-08T12:00:00Z',
      };
      mockFeedbackService.submitFeedback.mockResolvedValue(updated);

      const result = await controller.submitFeedback(contributorUser, FEEDBACK_ID, validBody);

      expect(result.data).toEqual(updated);
      expect(mockFeedbackService.submitFeedback).toHaveBeenCalledWith(
        FEEDBACK_ID,
        validBody,
        REVIEWER_ID,
        expect.any(String),
      );
    });

    it('rejects invalid body (validation errors)', async () => {
      const invalidBody = {
        responses: [{ questionId: 'code-quality', rating: 6, comment: 'short' }],
      };

      await expect(
        controller.submitFeedback(contributorUser, FEEDBACK_ID, invalidBody),
      ).rejects.toThrow(DomainException);

      expect(mockFeedbackService.submitFeedback).not.toHaveBeenCalled();
    });

    it('rejects invalid UUID param', async () => {
      await expect(controller.submitFeedback(contributorUser, 'bad-id', validBody)).rejects.toThrow(
        DomainException,
      );

      expect(mockFeedbackService.submitFeedback).not.toHaveBeenCalled();
    });
  });

  describe('GET /contributions/:id', () => {
    const assignments = [
      {
        id: FEEDBACK_ID,
        contributionId: CONTRIB_ID,
        reviewerId: REVIEWER_ID,
        reviewerName: 'Reviewer One',
        status: 'ASSIGNED',
        assignedAt: '2026-03-08T10:00:00Z',
      },
    ];

    it('passes reviewer filter for CONTRIBUTOR', async () => {
      mockFeedbackService.getAssignmentsForContribution.mockResolvedValue(assignments);

      await controller.getContributionFeedback(contributorUser, CONTRIB_ID);

      expect(mockFeedbackService.getAssignmentsForContribution).toHaveBeenCalledWith(
        CONTRIB_ID,
        REVIEWER_ID,
      );
    });

    it('does not pass reviewer filter for ADMIN', async () => {
      mockFeedbackService.getAssignmentsForContribution.mockResolvedValue(assignments);

      await controller.getContributionFeedback(adminUser, CONTRIB_ID);

      expect(mockFeedbackService.getAssignmentsForContribution).toHaveBeenCalledWith(CONTRIB_ID);
    });

    it('rejects invalid UUID param', async () => {
      await expect(controller.getContributionFeedback(contributorUser, 'invalid')).rejects.toThrow(
        DomainException,
      );

      expect(mockFeedbackService.getAssignmentsForContribution).not.toHaveBeenCalled();
    });
  });

  describe('guard verification', () => {
    it('controller class uses JwtAuthGuard and AbilityGuard decorators', () => {
      const guards = Reflect.getMetadata('__guards__', FeedbackController);
      expect(guards).toBeDefined();
      expect(guards).toHaveLength(2);
    });
  });
});

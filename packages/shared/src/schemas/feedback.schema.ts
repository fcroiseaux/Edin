import { z } from 'zod';
import { MIN_COMMENT_LENGTH, MAX_COMMENT_LENGTH } from '../constants/feedback-rubric.js';

export const feedbackStatusEnum = z.enum(['ASSIGNED', 'COMPLETED', 'REASSIGNED', 'UNASSIGNED']);

export const peerFeedbackSchema = z.object({
  id: z.string().uuid(),
  contributionId: z.string().uuid(),
  reviewerId: z.string().uuid(),
  status: feedbackStatusEnum,
  ratings: z
    .object({
      rubricVersion: z.string(),
      responses: z.array(
        z.object({
          questionId: z.string(),
          rating: z.number(),
          comment: z.string(),
        }),
      ),
    })
    .nullable(),
  comments: z.string().nullable(),
  assignedBy: z.string().uuid().nullable(),
  assignedAt: z.string().datetime(),
  submittedAt: z.string().datetime().nullable(),
  reassignedAt: z.string().datetime().nullable(),
  reassignReason: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const feedbackQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: feedbackStatusEnum.optional(),
});

export const feedbackAssignmentSchema = z.object({
  contributionId: z.string().uuid(),
  reviewerId: z.string().uuid(),
});

export const rubricResponseSchema = z.object({
  questionId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(MIN_COMMENT_LENGTH).max(MAX_COMMENT_LENGTH),
});

export const feedbackSubmissionSchema = z.object({
  responses: z.array(rubricResponseSchema).min(1),
  overallComment: z.string().max(MAX_COMMENT_LENGTH).optional(),
});

export const feedbackDetailSchema = peerFeedbackSchema.extend({
  contribution: z.object({
    id: z.string().uuid(),
    title: z.string(),
    description: z.string().nullable(),
    contributionType: z.string(),
  }),
  reviewer: z.object({
    id: z.string().uuid(),
    name: z.string(),
    avatarUrl: z.string().nullable(),
    domain: z.string().nullable(),
  }),
});

export type PeerFeedbackSchemaDto = z.infer<typeof peerFeedbackSchema>;
export type FeedbackQuerySchemaDto = z.infer<typeof feedbackQuerySchema>;
export type FeedbackAssignmentSchemaDto = z.infer<typeof feedbackAssignmentSchema>;
export type RubricResponseSchemaDto = z.infer<typeof rubricResponseSchema>;
export type FeedbackSubmissionSchemaDto = z.infer<typeof feedbackSubmissionSchema>;
export type FeedbackDetailSchemaDto = z.infer<typeof feedbackDetailSchema>;

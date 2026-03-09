import { z } from 'zod';

export const evaluationStatusEnum = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED']);

export const contributionTypeFilterEnum = z.enum(['COMMIT', 'PULL_REQUEST', 'DOCUMENTATION']);

export const evaluationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: evaluationStatusEnum.optional(),
  contributionId: z.string().uuid().optional(),
  contributionType: contributionTypeFilterEnum.optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

export type EvaluationQuerySchemaDto = z.infer<typeof evaluationQuerySchema>;

export const evaluationHistoryQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  contributionType: contributionTypeFilterEnum.optional(),
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

export type EvaluationHistoryQuerySchemaDto = z.infer<typeof evaluationHistoryQuerySchema>;

// ─── Human Review & Benchmarking (Story 7-4) ───────────────────────────────

export const flagEvaluationSchema = z.object({
  flagReason: z
    .string()
    .min(50, 'Please provide at least 50 characters explaining your concern')
    .max(2000),
});

export type FlagEvaluationSchemaDto = z.infer<typeof flagEvaluationSchema>;

export const resolveReviewSchema = z
  .object({
    action: z.enum(['confirm', 'override']),
    reviewReason: z.string().min(10, 'Please provide at least 10 characters').max(2000),
    overrideScores: z
      .object({
        compositeScore: z.number().min(0).max(100),
        dimensionScores: z.record(
          z.object({
            score: z.number().min(0).max(100),
            explanation: z.string(),
          }),
        ),
      })
      .optional(),
    overrideNarrative: z.string().max(5000).optional(),
  })
  .refine(
    (data) => {
      if (data.action === 'override') {
        return data.overrideScores !== undefined;
      }
      return true;
    },
    { message: 'Override scores are required when action is override', path: ['overrideScores'] },
  );

export type ResolveReviewSchemaDto = z.infer<typeof resolveReviewSchema>;

export const reviewQueueQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  domain: z.string().optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'OVERRIDDEN']).optional(),
});

export type ReviewQueueQuerySchemaDto = z.infer<typeof reviewQueueQuerySchema>;

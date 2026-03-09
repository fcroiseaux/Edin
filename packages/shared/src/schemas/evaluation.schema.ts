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

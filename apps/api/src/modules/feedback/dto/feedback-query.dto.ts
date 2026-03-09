import { z } from 'zod';

const feedbackStatusEnum = z.enum(['ASSIGNED', 'COMPLETED', 'REASSIGNED', 'UNASSIGNED']);

export const feedbackQueryDto = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: feedbackStatusEnum.optional(),
});

export const adminAssignDto = z.object({
  contributionId: z.string().uuid(),
  reviewerId: z.string().uuid(),
});

export type FeedbackQueryDto = z.infer<typeof feedbackQueryDto>;
export type AdminAssignDto = z.infer<typeof adminAssignDto>;

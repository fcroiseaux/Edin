import { z } from 'zod';

const domainEnum = z.enum(['Technology', 'Finance', 'Impact', 'Governance']);
const activityEventTypeEnum = z.enum([
  'CONTRIBUTION_NEW',
  'EVALUATION_COMPLETED',
  'ANNOUNCEMENT_CREATED',
  'MEMBER_JOINED',
  'TASK_COMPLETED',
  'FEEDBACK_ASSIGNED',
  'FEEDBACK_SUBMITTED',
  'FEEDBACK_REASSIGNED',
  'SPRINT_STARTED',
  'SPRINT_COMPLETED',
  'SPRINT_VELOCITY_MILESTONE',
  'CROSS_DOMAIN_COLLABORATION_DETECTED',
  'HIGH_SIGNIFICANCE_CONTRIBUTION',
  'PRIZE_AWARDED',
]);
const contributionTypeEnum = z.enum(['COMMIT', 'PULL_REQUEST', 'CODE_REVIEW']);

export const activityEventSchema = z.object({
  id: z.string().uuid(),
  eventType: activityEventTypeEnum,
  title: z.string(),
  description: z.string().nullable(),
  contributorId: z.string().uuid(),
  contributorName: z.string().optional(),
  contributorAvatarUrl: z.string().nullable().optional(),
  domain: domainEnum,
  contributionType: contributionTypeEnum.nullable(),
  entityId: z.string(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string().datetime(),
});

export const activityFeedQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  domain: domainEnum.optional(),
});

export type ActivityEventSchemaDto = z.infer<typeof activityEventSchema>;
export type ActivityFeedQuerySchemaDto = z.infer<typeof activityFeedQuerySchema>;

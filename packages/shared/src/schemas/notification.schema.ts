import { z } from 'zod';

const notificationTypeEnum = z.enum([
  'EVALUATION_COMPLETED',
  'PEER_FEEDBACK_AVAILABLE',
  'ANNOUNCEMENT_POSTED',
  'CONTRIBUTION_TO_DOMAIN',
  'TASK_ASSIGNED',
  'ARTICLE_FEEDBACK',
  'ARTICLE_PUBLISHED',
  'SPRINT_DEADLINE_APPROACHING',
  'SPRINT_VELOCITY_DROP',
  'SPRINT_SCOPE_CHANGED',
]);

const notificationCategoryEnum = z.enum([
  'evaluations',
  'feedback',
  'working-groups',
  'tasks',
  'publications',
  'sprints',
]);

export const notificationSchema = z.object({
  id: z.string().uuid(),
  contributorId: z.string().uuid(),
  type: notificationTypeEnum,
  title: z.string(),
  description: z.string().nullable(),
  entityId: z.string(),
  category: notificationCategoryEnum,
  read: z.boolean(),
  createdAt: z.string().datetime(),
  readAt: z.string().datetime().nullable(),
});

export const notificationQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  category: notificationCategoryEnum.optional(),
});

export const unreadCountResponseSchema = z.record(z.string(), z.number().int().min(0));

export type NotificationSchemaDto = z.infer<typeof notificationSchema>;
export type NotificationQuerySchemaDto = z.infer<typeof notificationQuerySchema>;
export type UnreadCountResponseSchemaDto = z.infer<typeof unreadCountResponseSchema>;

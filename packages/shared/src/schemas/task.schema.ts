import { z } from 'zod';

const domainEnum = z.enum(['Technology', 'Finance', 'Impact', 'Governance']);
const taskStatusEnum = z.enum([
  'AVAILABLE',
  'CLAIMED',
  'IN_PROGRESS',
  'COMPLETED',
  'EVALUATED',
  'RETIRED',
]);
const taskDifficultyEnum = z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);

export const taskSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  domain: domainEnum,
  difficulty: taskDifficultyEnum,
  estimatedEffort: z.string(),
  status: taskStatusEnum,
  sortOrder: z.number().int(),
  claimedById: z.string().uuid().nullable(),
  claimedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  createdById: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  zenhubIssueId: z.string().nullable().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required'),
  domain: domainEnum,
  difficulty: taskDifficultyEnum,
  estimatedEffort: z.string().min(1, 'Estimated effort is required'),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  domain: domainEnum.optional(),
  difficulty: taskDifficultyEnum.optional(),
  estimatedEffort: z.string().min(1).optional(),
});

export const claimTaskSchema = z.object({});

export const updateTaskStatusSchema = z.object({
  status: taskStatusEnum,
});

export const listTasksQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  domain: domainEnum.optional(),
  difficulty: taskDifficultyEnum.optional(),
  status: taskStatusEnum.optional(),
});

export const reorderTasksSchema = z.object({
  domain: domainEnum,
  tasks: z
    .array(
      z.object({
        taskId: z.string().uuid(),
        sortOrder: z.number().int().min(0),
      }),
    )
    .min(1, 'At least one task must be provided'),
});

export type TaskSchemaDto = z.infer<typeof taskSchema>;
export type CreateTaskSchemaDto = z.infer<typeof createTaskSchema>;
export type UpdateTaskSchemaDto = z.infer<typeof updateTaskSchema>;
export type ClaimTaskSchemaDto = z.infer<typeof claimTaskSchema>;
export type UpdateTaskStatusSchemaDto = z.infer<typeof updateTaskStatusSchema>;
export type ListTasksQuerySchemaDto = z.infer<typeof listTasksQuerySchema>;
export type ReorderTasksSchemaDto = z.infer<typeof reorderTasksSchema>;

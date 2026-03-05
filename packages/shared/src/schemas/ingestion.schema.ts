import { z } from 'zod';

export const addRepositorySchema = z.object({
  owner: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Invalid owner format'),
  repo: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Invalid repo format'),
});

export type AddRepositoryDto = z.infer<typeof addRepositorySchema>;

export const repositoryStatusEnum = z.enum(['ACTIVE', 'PENDING', 'ERROR', 'REMOVING']);

export const repositoryResponseSchema = z.object({
  id: z.string().uuid(),
  owner: z.string(),
  repo: z.string(),
  fullName: z.string(),
  webhookId: z.number().nullable(),
  status: repositoryStatusEnum,
  statusMessage: z.string().nullable(),
  addedById: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const listRepositoriesQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListRepositoriesQueryDto = z.infer<typeof listRepositoriesQuerySchema>;

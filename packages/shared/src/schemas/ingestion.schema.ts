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

// Contribution schemas

export const contributionSourceEnum = z.enum(['GITHUB']);

export const contributionTypeEnum = z.enum(['COMMIT', 'PULL_REQUEST', 'CODE_REVIEW']);

export const contributionStatusEnum = z.enum([
  'INGESTED',
  'ATTRIBUTED',
  'UNATTRIBUTED',
  'EVALUATED',
]);

export const webhookDeliveryStatusEnum = z.enum(['RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED']);

export const contributionResponseSchema = z.object({
  id: z.string().uuid(),
  contributorId: z.string().uuid().nullable(),
  repositoryId: z.string().uuid(),
  source: contributionSourceEnum,
  sourceRef: z.string(),
  contributionType: contributionTypeEnum,
  title: z.string(),
  description: z.string().nullable(),
  rawData: z.record(z.unknown()),
  normalizedAt: z.string(),
  status: contributionStatusEnum,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const webhookPayloadSchema = z.object({
  eventType: z.enum(['push', 'pull_request', 'pull_request_review']),
  repositoryFullName: z.string(),
  payload: z.record(z.unknown()),
  deliveryId: z.string(),
});

// Contribution list/detail schemas (Story 4-3)

export const contributionListQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: contributionTypeEnum.optional(),
});

export type ContributionListQueryDto = z.infer<typeof contributionListQuerySchema>;

export const contributionDetailResponseSchema = z.object({
  id: z.string().uuid(),
  contributorId: z.string().uuid().nullable(),
  repositoryId: z.string().uuid(),
  repositoryName: z.string(),
  source: contributionSourceEnum,
  sourceRef: z.string(),
  contributionType: contributionTypeEnum,
  title: z.string(),
  description: z.string().nullable(),
  rawData: z.record(z.unknown()),
  normalizedAt: z.string(),
  status: contributionStatusEnum,
  createdAt: z.string(),
  updatedAt: z.string(),
});

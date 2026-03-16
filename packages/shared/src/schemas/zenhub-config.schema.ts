import { z } from 'zod';

const taskStatusValues = [
  'AVAILABLE',
  'CLAIMED',
  'IN_PROGRESS',
  'COMPLETED',
  'EVALUATED',
  'RETIRED',
] as const;

export const zenhubConfigResponseSchema = z.object({
  apiTokenConfigured: z.boolean(),
  apiTokenHint: z.string().nullable(),
  webhookUrl: z.string().nullable(),
  webhookSecretConfigured: z.boolean(),
  pollingIntervalMs: z.number().int().min(60_000).default(900_000),
  workspaceMapping: z.record(z.string(), z.string()).nullable().default(null),
  taskSyncEnabled: z.boolean().default(false),
  contributorTaskLabel: z.string().nullable().default(null),
  taskSyncCreatorId: z.string().uuid().nullable().default(null),
  statusSyncEnabled: z.boolean().default(false),
  pipelineStatusMapping: z.record(z.string(), z.enum(taskStatusValues)).nullable().default(null),
  planningContextEnabled: z.boolean().default(false),
  combinedScoreEnabled: z.boolean().default(false),
  qualityWeight: z.number().min(0).max(1).default(0.8),
  planningWeight: z.number().min(0).max(1).default(0.2),
});

export const updateZenhubConfigSchema = z.object({
  apiToken: z.string().min(1).optional(),
  webhookUrl: z.string().url().optional(),
  webhookSecret: z.string().min(16).optional(),
  pollingIntervalMs: z.number().int().min(60_000).max(86_400_000).optional(),
  workspaceMapping: z.record(z.string(), z.string()).optional(),
  taskSyncEnabled: z.boolean().optional(),
  contributorTaskLabel: z.string().min(1).max(100).optional(),
  taskSyncCreatorId: z.string().uuid().optional(),
  statusSyncEnabled: z.boolean().optional(),
  pipelineStatusMapping: z.record(z.string(), z.enum(taskStatusValues)).optional(),
  planningContextEnabled: z.boolean().optional(),
  combinedScoreEnabled: z.boolean().optional(),
  qualityWeight: z.number().min(0).max(1).optional(),
  planningWeight: z.number().min(0).max(1).optional(),
});

export type ZenhubConfigResponseDto = z.infer<typeof zenhubConfigResponseSchema>;
export type UpdateZenhubConfigDto = z.infer<typeof updateZenhubConfigSchema>;

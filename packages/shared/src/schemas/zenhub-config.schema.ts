import { z } from 'zod';

export const zenhubConfigResponseSchema = z.object({
  apiTokenConfigured: z.boolean(),
  apiTokenHint: z.string().nullable(),
  webhookUrl: z.string().nullable(),
  webhookSecretConfigured: z.boolean(),
  pollingIntervalMs: z.number().int().min(60_000).default(900_000),
  workspaceMapping: z.record(z.string(), z.string()).nullable().default(null),
});

export const updateZenhubConfigSchema = z.object({
  apiToken: z.string().min(1).optional(),
  webhookUrl: z.string().url().optional(),
  webhookSecret: z.string().min(16).optional(),
  pollingIntervalMs: z.number().int().min(60_000).max(86_400_000).optional(),
  workspaceMapping: z.record(z.string(), z.string()).optional(),
});

export type ZenhubConfigResponseDto = z.infer<typeof zenhubConfigResponseSchema>;
export type UpdateZenhubConfigDto = z.infer<typeof updateZenhubConfigSchema>;

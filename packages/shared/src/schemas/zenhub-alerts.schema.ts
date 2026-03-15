import { z } from 'zod';

export const updateZenhubAlertConfigSchema = z.object({
  webhookFailureThreshold: z.number().min(0).max(100).optional(),
  pollingTimeoutMinutes: z.number().int().min(1).max(1440).optional(),
  enabled: z.boolean().optional(),
});

export type UpdateZenhubAlertConfigDto = z.infer<typeof updateZenhubAlertConfigSchema>;

export const zenhubSyncConflictQuerySchema = z.object({
  resolution: z.enum(['auto-resolved', 'pending', 'manual-resolved']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});

export type ZenhubSyncConflictQueryDto = z.infer<typeof zenhubSyncConflictQuerySchema>;

export const resolveZenhubSyncConflictSchema = z.object({
  action: z.enum(['keep-edin', 'apply-status']),
  applyStatus: z.string().optional(),
});

export type ResolveZenhubSyncConflictDto = z.infer<typeof resolveZenhubSyncConflictSchema>;

import { z } from 'zod';

export const zenhubSyncLogQuerySchema = z.object({
  syncType: z.enum(['WEBHOOK', 'POLL', 'BACKFILL']).optional(),
  status: z.enum(['RECEIVED', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
  eventType: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  correlationId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
});

export type ZenhubSyncLogQueryDto = z.infer<typeof zenhubSyncLogQuerySchema>;

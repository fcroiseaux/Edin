import { z } from 'zod';

export const zenhubWebhookPayloadSchema = z
  .object({
    type: z.string(),
    organization: z.string().optional(),
    repo: z.string().optional(),
    workspace_id: z.string().optional(),
  })
  .passthrough();

export type ZenhubWebhookPayloadDto = z.infer<typeof zenhubWebhookPayloadSchema>;

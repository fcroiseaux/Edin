import { z } from 'zod';

export const designateFoundingSchema = z.object({
  reason: z.string().trim().min(10, 'Reason must be at least 10 characters'),
});

export type DesignateFoundingDto = z.infer<typeof designateFoundingSchema>;

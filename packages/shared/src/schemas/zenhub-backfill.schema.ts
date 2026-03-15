import { z } from 'zod';

export const triggerBackfillSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type TriggerBackfillDto = z.infer<typeof triggerBackfillSchema>;

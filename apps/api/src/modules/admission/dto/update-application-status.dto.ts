import { z } from 'zod';
import { updateApplicationStatusSchema } from '@edin/shared';

export { updateApplicationStatusSchema };

export type UpdateApplicationStatusDto = z.infer<typeof updateApplicationStatusSchema>;

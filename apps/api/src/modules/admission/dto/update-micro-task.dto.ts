import { z } from 'zod';
import { updateMicroTaskSchema } from '@edin/shared';

export { updateMicroTaskSchema };

export type UpdateMicroTaskDto = z.infer<typeof updateMicroTaskSchema>;

import { z } from 'zod';
import { createMicroTaskSchema } from '@edin/shared';

export { createMicroTaskSchema };

export type CreateMicroTaskDto = z.infer<typeof createMicroTaskSchema>;

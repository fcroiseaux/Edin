import { z } from 'zod';
import { listMicroTasksQuerySchema } from '@edin/shared';

export { listMicroTasksQuerySchema };

export type ListMicroTasksQueryDto = z.infer<typeof listMicroTasksQuerySchema>;

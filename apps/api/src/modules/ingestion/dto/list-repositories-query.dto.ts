import { z } from 'zod';
import { listRepositoriesQuerySchema } from '@edin/shared';

export { listRepositoriesQuerySchema };

export type ListRepositoriesQueryDto = z.infer<typeof listRepositoriesQuerySchema>;

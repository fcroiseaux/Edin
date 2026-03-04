import { z } from 'zod';
import { listApplicationsQuerySchema } from '@edin/shared';

export { listApplicationsQuerySchema };

export type ListApplicationsQueryDto = z.infer<typeof listApplicationsQuerySchema>;

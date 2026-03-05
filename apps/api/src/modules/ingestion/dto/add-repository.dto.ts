import { z } from 'zod';
import { addRepositorySchema } from '@edin/shared';

export { addRepositorySchema };

export type AddRepositoryDto = z.infer<typeof addRepositorySchema>;

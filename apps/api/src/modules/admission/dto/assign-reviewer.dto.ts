import { z } from 'zod';
import { assignReviewerSchema } from '@edin/shared';

export { assignReviewerSchema };

export type AssignReviewerDto = z.infer<typeof assignReviewerSchema>;

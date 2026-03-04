import { z } from 'zod';
import { submitReviewSchema } from '@edin/shared';

export { submitReviewSchema };

export type SubmitReviewDto = z.infer<typeof submitReviewSchema>;

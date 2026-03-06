import { z } from 'zod';
import { contributionListQuerySchema } from '@edin/shared';

export { contributionListQuerySchema };

export type ContributionListQueryDto = z.infer<typeof contributionListQuerySchema>;

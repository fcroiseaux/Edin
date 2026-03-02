import type { z } from 'zod';
import type {
  createContributorSchema,
  updateContributorSchema,
} from '../schemas/contributor.schema.js';

export type CreateContributorInput = z.infer<typeof createContributorSchema>;
export type UpdateContributorInput = z.infer<typeof updateContributorSchema>;

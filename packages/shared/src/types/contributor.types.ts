import type { z } from 'zod';
import type {
  createContributorSchema,
  updateContributorSchema,
} from '../schemas/contributor.schema.js';

export type CreateContributorInput = z.infer<typeof createContributorSchema>;
export type UpdateContributorInput = z.infer<typeof updateContributorSchema>;

export interface PublicContributorProfile {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  domain: string | null;
  skillAreas: string[];
  role: string;
  createdAt: string;
  showEvaluationScores: boolean;
}

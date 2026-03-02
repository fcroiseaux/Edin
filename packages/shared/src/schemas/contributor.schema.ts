import { z } from 'zod';
import { DOMAINS } from '../constants/domains.js';
import { ROLES } from '../constants/roles.js';

const MAX_BIO_LENGTH = 500;

const domainEnum = z.enum([
  DOMAINS.Technology,
  DOMAINS.Fintech,
  DOMAINS.Impact,
  DOMAINS.Governance,
]);

const roleEnum = z.enum([
  ROLES.PUBLIC,
  ROLES.APPLICANT,
  ROLES.CONTRIBUTOR,
  ROLES.EDITOR,
  ROLES.FOUNDING_CONTRIBUTOR,
  ROLES.WORKING_GROUP_LEAD,
  ROLES.ADMIN,
]);

/**
 * Validates new contributor creation from OAuth callback.
 */
export const createContributorSchema = z.object({
  github_id: z.number().int().positive(),
  name: z.string().min(1),
  email: z.string().email().nullable(),
  avatar_url: z.string().url(),
  bio: z.string().max(MAX_BIO_LENGTH).optional(),
  domain: domainEnum.optional(),
});

/**
 * Validates contributor profile updates.
 * Rejects changes to system fields: id, github_id, role, is_active.
 */
export const updateContributorSchema = z
  .object({
    name: z.string().min(1).optional(),
    bio: z.string().max(MAX_BIO_LENGTH).optional(),
    domain: domainEnum.optional(),
    avatar_url: z.string().url().optional(),
  })
  .strict();

export { domainEnum, roleEnum, MAX_BIO_LENGTH };

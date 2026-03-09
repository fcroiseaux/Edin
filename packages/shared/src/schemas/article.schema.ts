import { z } from 'zod';

export const ARTICLE_DOMAINS = ['Technology', 'Fintech', 'Impact', 'Governance'] as const;

export const articleDomainEnum = z.enum(ARTICLE_DOMAINS);

/**
 * Schema for creating a new article draft.
 * Lenient validation — title and domain required, body/abstract can start empty.
 */
export const createArticleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
  abstract: z.string().max(300, 'Abstract must be 300 characters or less').default(''),
  body: z.string().default(''),
  domain: articleDomainEnum,
});

/**
 * Schema for auto-save / partial draft updates. All fields optional.
 */
export const updateArticleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  abstract: z.string().max(300).optional(),
  body: z.string().optional(),
  domain: articleDomainEnum.optional(),
});

/**
 * Strict schema for submission validation.
 * All fields required with minimum lengths enforced.
 */
export const submitArticleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  abstract: z
    .string()
    .min(50, 'Abstract must be at least 50 characters')
    .max(300, 'Abstract must be 300 characters or less'),
  body: z.string().min(500, 'Article body must be at least 500 characters'),
  domain: articleDomainEnum,
});

export type CreateArticleDto = z.infer<typeof createArticleSchema>;
export type UpdateArticleDto = z.infer<typeof updateArticleSchema>;
export type SubmitArticleValidation = z.infer<typeof submitArticleSchema>;

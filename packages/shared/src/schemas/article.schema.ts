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

/**
 * Schema for editorial feedback submission.
 * Revision requests required when decision is REQUEST_REVISIONS.
 */
export const EDITORIAL_DECISIONS = ['APPROVE', 'REQUEST_REVISIONS', 'REJECT'] as const;

export const editorialDecisionEnum = z.enum(EDITORIAL_DECISIONS);

export const inlineCommentInputSchema = z.object({
  content: z.string().min(1, 'Comment content is required'),
  highlightStart: z.number().int().min(0),
  highlightEnd: z.number().int().min(0),
});

export const editorialFeedbackSchema = z
  .object({
    decision: editorialDecisionEnum,
    overallAssessment: z.string().min(10, 'Assessment must be at least 10 characters'),
    revisionRequests: z
      .array(z.object({ description: z.string().min(1, 'Description is required') }))
      .optional()
      .default([]),
    inlineComments: z.array(inlineCommentInputSchema).optional().default([]),
  })
  .refine(
    (data) => {
      if (data.decision === 'REQUEST_REVISIONS') {
        return data.revisionRequests && data.revisionRequests.length > 0;
      }
      return true;
    },
    {
      message: 'At least one revision request is required when requesting revisions',
      path: ['revisionRequests'],
    },
  );

/**
 * Schema for resubmitting an article after revisions.
 */
export const resubmitArticleSchema = z.object({
  body: z.string().min(500, 'Article body must be at least 500 characters'),
});

/**
 * Schema for public article listing query parameters.
 */
export const publicArticleFilterSchema = z.object({
  domain: articleDomainEnum.optional(),
  authorId: z.string().uuid().optional(),
  dateFrom: z.string().datetime({ offset: true }).optional(),
  dateTo: z.string().datetime({ offset: true }).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

export type PublicArticleFilterDto = z.infer<typeof publicArticleFilterSchema>;

export type CreateArticleDto = z.infer<typeof createArticleSchema>;
export type UpdateArticleDto = z.infer<typeof updateArticleSchema>;
export type SubmitArticleValidation = z.infer<typeof submitArticleSchema>;
export type EditorialFeedbackInput = z.infer<typeof editorialFeedbackSchema>;
export type InlineCommentInput = z.infer<typeof inlineCommentInputSchema>;
export type ResubmitArticleInput = z.infer<typeof resubmitArticleSchema>;

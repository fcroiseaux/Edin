import { z } from 'zod';
import { DOMAINS } from '../constants/domains.js';

const domainEnum = z.enum([
  DOMAINS.Technology,
  DOMAINS.Fintech,
  DOMAINS.Impact,
  DOMAINS.Governance,
]);

export const createApplicationSchema = z.object({
  applicantName: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  applicantEmail: z.string().email('Please enter a valid email address'),
  domain: domainEnum,
  statementOfInterest: z
    .string()
    .min(1, 'Statement of interest is required')
    .max(300, 'Statement must be 300 characters or less'),
  microTaskResponse: z.string().min(1, 'Micro-task response is required'),
  microTaskSubmissionUrl: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  gdprConsent: z
    .boolean()
    .refine((val) => val === true, { message: 'You must accept the data processing agreement' }),
});

export type CreateApplicationDto = z.infer<typeof createApplicationSchema>;

// --- Review workflow schemas (Story 3-2) ---

const reviewRecommendationEnum = z.enum(['APPROVE', 'REQUEST_MORE_INFO', 'DECLINE']);

export const submitReviewSchema = z.object({
  recommendation: reviewRecommendationEnum,
  feedback: z
    .string()
    .min(10, 'Feedback must be at least 10 characters')
    .max(2000, 'Feedback must be 2000 characters or less'),
});

export type SubmitReviewDto = z.infer<typeof submitReviewSchema>;

export const updateApplicationStatusSchema = z
  .object({
    status: z.enum(['APPROVED', 'DECLINED', 'REQUEST_MORE_INFO']),
    reason: z.string().max(2000).optional(),
  })
  .refine(
    (data) =>
      !['DECLINED', 'REQUEST_MORE_INFO'].includes(data.status) ||
      (data.reason && data.reason.trim().length > 0),
    {
      message: 'A reason is required when declining an application or requesting more information',
      path: ['reason'],
    },
  );

export type UpdateApplicationStatusDto = z.infer<typeof updateApplicationStatusSchema>;

export const assignReviewerSchema = z.object({
  contributorId: z.string().uuid('Contributor ID must be a valid UUID'),
});

export type AssignReviewerDto = z.infer<typeof assignReviewerSchema>;

export const listApplicationsQuerySchema = z.object({
  domain: z.enum(['Technology', 'Fintech', 'Impact', 'Governance']).optional(),
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'DECLINED']).optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListApplicationsQueryDto = z.infer<typeof listApplicationsQuerySchema>;

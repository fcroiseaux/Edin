import type { z } from 'zod';
import type {
  createApplicationSchema,
  submitReviewSchema,
  updateApplicationStatusSchema,
  assignReviewerSchema,
  listApplicationsQuerySchema,
} from '../schemas/admission.schema.js';

export type ApplicationStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'DECLINED';

export type ReviewRecommendation = 'APPROVE' | 'REQUEST_MORE_INFO' | 'DECLINE';

export interface Application {
  id: string;
  applicantName: string;
  applicantEmail: string;
  domain: string;
  statementOfInterest: string;
  microTaskDomain: string;
  microTaskResponse: string;
  microTaskSubmissionUrl: string | null;
  gdprConsentVersion: string;
  gdprConsentedAt: string;
  status: ApplicationStatus;
  contributorId: string | null;
  reviewedById: string | null;
  reviewedAt: string | null;
  declineReason: string | null;
  ignitionStartedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationReview {
  id: string;
  applicationId: string;
  reviewerId: string;
  recommendation: ReviewRecommendation | null;
  feedback: string | null;
  submittedAt: string | null;
  createdAt: string;
}

export interface MicroTask {
  id: string;
  domain: string;
  title: string;
  description: string;
  expectedDeliverable: string;
  estimatedEffort: string;
  submissionFormat: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConsentRecord {
  id: string;
  entityType: string;
  entityId: string;
  consentType: string;
  consentVersion: string;
  accepted: boolean;
  acceptedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
export type UpdateApplicationStatusInput = z.infer<typeof updateApplicationStatusSchema>;
export type AssignReviewerInput = z.infer<typeof assignReviewerSchema>;
export type ListApplicationsQuery = z.infer<typeof listApplicationsQuerySchema>;

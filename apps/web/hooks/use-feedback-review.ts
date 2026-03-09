'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { PaginationMeta, FeedbackSubmissionDto, RubricData } from '@edin/shared';

interface AssignmentDetailResponse {
  data: {
    id: string;
    contributionId: string;
    reviewerId: string;
    status: string;
    ratings: RubricData | null;
    comments: string | null;
    assignedBy: string | null;
    assignedAt: string;
    submittedAt: string | null;
    contribution: {
      id: string;
      title: string;
      description: string | null;
      contributionType: string;
    };
    contributorName: string | null;
    contributorDomain: string | null;
  };
  meta: { timestamp: string; correlationId: string };
}

interface SubmitFeedbackResponse {
  data: unknown;
  meta: { timestamp: string; correlationId: string };
}

export interface AssignmentListResponse {
  data: Array<{
    id: string;
    contributionId: string;
    reviewerId: string;
    status: string;
    assignedBy: string | null;
    assignedAt: string;
    submittedAt: string | null;
    contributionTitle: string;
    contributionType: string;
  }>;
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

export function useFeedbackReview(feedbackId: string) {
  return useQuery<AssignmentDetailResponse>({
    queryKey: ['feedback', 'assignments', feedbackId],
    queryFn: () =>
      apiClient<AssignmentDetailResponse>(`/api/v1/feedback/assignments/${feedbackId}`),
    enabled: !!feedbackId,
  });
}

export function useSubmitFeedback() {
  const queryClient = useQueryClient();

  return useMutation<
    SubmitFeedbackResponse,
    Error,
    { feedbackId: string; data: FeedbackSubmissionDto }
  >({
    mutationFn: ({ feedbackId, data }) =>
      apiClient<SubmitFeedbackResponse>(`/api/v1/feedback/${feedbackId}/submit`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback', 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['feedback', 'received'] });
    },
  });
}

export function usePendingAssignments() {
  return useQuery<AssignmentListResponse>({
    queryKey: ['feedback', 'assignments', { status: 'ASSIGNED' }],
    queryFn: () =>
      apiClient<AssignmentListResponse>('/api/v1/feedback/assignments?status=ASSIGNED'),
  });
}

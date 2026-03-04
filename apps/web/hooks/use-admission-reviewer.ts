'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface AssignedReview {
  id: string;
  recommendation: string | null;
  feedback: string | null;
  createdAt: string;
  application: {
    id: string;
    applicantName: string;
    domain: string;
    status: string;
    createdAt: string;
  };
}

interface ApplicationFull {
  id: string;
  applicantName: string;
  applicantEmail: string;
  domain: string;
  statementOfInterest: string;
  microTaskDomain: string;
  microTaskResponse: string;
  microTaskSubmissionUrl: string | null;
  status: string;
  createdAt: string;
  reviews: {
    id: string;
    recommendation: string;
    feedback: string | null;
    createdAt: string;
    reviewer: { id: string; name: string; domain: string | null; avatarUrl: string | null };
  }[];
}

export function useMyReviews() {
  const { data, isLoading, error } = useQuery<{ data: AssignedReview[] }>({
    queryKey: ['admission', 'my-reviews'],
    queryFn: async () => apiClient<{ data: AssignedReview[] }>('/api/v1/admission/my-reviews'),
    staleTime: 30_000,
  });

  return { reviews: data?.data ?? [], isLoading, error };
}

export function useReviewApplicationDetail(applicationId: string | null) {
  const { data, isLoading, error } = useQuery<{ data: ApplicationFull }>({
    queryKey: ['admission', 'application', applicationId],
    queryFn: async () =>
      apiClient<{ data: ApplicationFull }>(`/api/v1/admission/applications/${applicationId}/full`),
    enabled: !!applicationId,
    staleTime: 15_000,
  });

  return { application: data?.data ?? null, isLoading, error };
}

export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      recommendation,
      feedback,
    }: {
      applicationId: string;
      recommendation: 'APPROVE' | 'REQUEST_MORE_INFO' | 'DECLINE';
      feedback: string;
    }) => {
      return apiClient(`/api/v1/admission/applications/${applicationId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ recommendation, feedback }),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admission'] });
    },
  });
}

export type { AssignedReview };

'use client';

import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { PaginationMeta } from '@edin/shared';

interface ApplicationListItem {
  id: string;
  applicantName: string;
  domain: string;
  status: string;
  createdAt: string;
  reviews: {
    id: string;
    reviewer: { id: string; name: string; domain: string | null };
    recommendation: string | null;
  }[];
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
  declineReason: string | null;
  reviewedAt: string | null;
  ignitionStartedAt: string | null;
  createdAt: string;
  updatedAt: string;
  reviews: {
    id: string;
    recommendation: string | null;
    feedback: string | null;
    createdAt: string;
    reviewer: { id: string; name: string; domain: string | null; avatarUrl: string | null };
  }[];
  contributor: { id: string; name: string; domain: string | null } | null;
  reviewedBy: { id: string; name: string } | null;
}

interface Reviewer {
  id: string;
  name: string;
  domain: string | null;
  avatarUrl: string | null;
}

interface ApplicationsResponse {
  data: ApplicationListItem[];
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

interface UseAdmissionQueueOptions {
  domain?: string;
  status?: string;
}

export function useAdmissionQueue({ domain, status }: UseAdmissionQueueOptions = {}) {
  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<ApplicationsResponse>({
      queryKey: ['admission', 'applications', { domain, status }],
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams();
        if (domain) params.set('domain', domain);
        if (status) params.set('status', status);
        params.set('limit', '20');
        if (typeof pageParam === 'string' && pageParam.length > 0) {
          params.set('cursor', pageParam);
        }

        const qs = params.toString();
        return apiClient<ApplicationsResponse>(
          `/api/v1/admission/applications${qs ? `?${qs}` : ''}`,
        );
      },
      initialPageParam: '',
      getNextPageParam: (lastPage) =>
        lastPage.meta.pagination.hasMore
          ? (lastPage.meta.pagination.cursor ?? undefined)
          : undefined,
      staleTime: 30_000,
    });

  const applications = data?.pages.flatMap((page) => page.data) ?? [];
  const pagination = data?.pages[data.pages.length - 1]?.meta?.pagination;

  return {
    applications,
    pagination,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
    error,
    refetch,
  };
}

export function useApplicationDetail(applicationId: string | null) {
  const { data, isLoading, error } = useQuery<{ data: ApplicationFull }>({
    queryKey: ['admission', 'application', applicationId],
    queryFn: async () =>
      apiClient<{ data: ApplicationFull }>(`/api/v1/admission/applications/${applicationId}/full`),
    enabled: !!applicationId,
    staleTime: 15_000,
  });

  return { application: data?.data ?? null, isLoading, error };
}

export function useAvailableReviewers(domain?: string) {
  const { data, isLoading } = useQuery<{ data: Reviewer[] }>({
    queryKey: ['admission', 'reviewers', domain],
    queryFn: async () => {
      const qs = domain ? `?domain=${domain}` : '';
      return apiClient<{ data: Reviewer[] }>(`/api/v1/admission/reviewers${qs}`);
    },
    staleTime: 60_000,
  });

  return { reviewers: data?.data ?? [], isLoading };
}

export function useAssignReviewer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      contributorId,
    }: {
      applicationId: string;
      contributorId: string;
    }) => {
      return apiClient(`/api/v1/admission/applications/${applicationId}/reviewers`, {
        method: 'POST',
        body: JSON.stringify({ contributorId }),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admission'] });
    },
  });
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      status,
      reason,
    }: {
      applicationId: string;
      status: 'APPROVED' | 'DECLINED' | 'REQUEST_MORE_INFO';
      reason?: string;
    }) => {
      return apiClient(`/api/v1/admission/applications/${applicationId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admission'] });
    },
  });
}

export type { ApplicationListItem, ApplicationFull, Reviewer };

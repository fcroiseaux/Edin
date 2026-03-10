'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { ContributorListItem } from '@edin/shared';

interface ContributorListApiResponse {
  data: ContributorListItem[];
  meta: {
    timestamp: string;
    correlationId: string;
    pagination?: {
      cursor: string | null;
      hasMore: boolean;
      total: number;
    };
  };
}

export function useAdminContributors(params: {
  search?: string;
  role?: string;
  domain?: string;
  cursor?: string;
  limit?: number;
}) {
  const queryKey = ['admin', 'contributors', params];

  const { data, isLoading, error } = useQuery<ContributorListApiResponse>({
    queryKey,
    queryFn: () => {
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.set('search', params.search);
      if (params.role) searchParams.set('role', params.role);
      if (params.domain) searchParams.set('domain', params.domain);
      if (params.cursor) searchParams.set('cursor', params.cursor);
      if (params.limit) searchParams.set('limit', String(params.limit));
      const qs = searchParams.toString();
      return apiClient<ContributorListApiResponse>(
        `/api/v1/admin/contributors${qs ? `?${qs}` : ''}`,
      );
    },
  });

  return {
    contributors: data?.data ?? [],
    pagination: data?.meta?.pagination ?? null,
    isLoading,
    error,
  };
}

export function useUpdateContributorRole() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, { contributorId: string; role: string; reason: string }>({
    mutationFn: ({ contributorId, role, reason }) =>
      apiClient(`/api/v1/admin/contributors/${contributorId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role, reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'contributors'] });
    },
  });
}

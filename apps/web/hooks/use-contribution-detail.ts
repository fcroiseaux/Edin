'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { ContributionWithRepository } from '@edin/shared';

interface ContributionDetailResponse {
  data: ContributionWithRepository;
  meta: { timestamp: string; correlationId: string };
}

export function useContributionDetail(id: string | null) {
  const { data, isLoading, error } = useQuery<ContributionDetailResponse>({
    queryKey: ['contributions', 'me', id],
    queryFn: async () => {
      return apiClient<ContributionDetailResponse>(`/api/v1/contributors/me/contributions/${id}`);
    },
    enabled: !!id,
  });

  return {
    contribution: data?.data ?? null,
    isLoading,
    error,
  };
}

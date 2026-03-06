'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { ContributionWithRepository, PaginationMeta } from '@edin/shared';

interface ContributionListResponse {
  data: ContributionWithRepository[];
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

export function useContributions(type?: string) {
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<ContributionListResponse>({
      queryKey: ['contributions', 'me', type],
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams();
        params.set('limit', '20');
        if (pageParam) params.set('cursor', pageParam as string);
        if (type) params.set('type', type);

        return apiClient<ContributionListResponse>(
          `/api/v1/contributors/me/contributions?${params.toString()}`,
        );
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage.meta.pagination.hasMore ? lastPage.meta.pagination.cursor : undefined,
    });

  const contributions = data?.pages.flatMap((page) => page.data) ?? [];

  return {
    contributions,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
  };
}

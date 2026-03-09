'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { PaginationMeta, ReceivedFeedbackDto } from '@edin/shared';

interface ReceivedFeedbackResponse {
  data: ReceivedFeedbackDto[];
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

export function useReceivedFeedback() {
  const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<ReceivedFeedbackResponse>({
      queryKey: ['feedback', 'received'],
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams();
        params.set('limit', '20');
        if (pageParam) params.set('cursor', pageParam as string);

        return apiClient<ReceivedFeedbackResponse>(
          `/api/v1/feedback/received?${params.toString()}`,
        );
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage.meta.pagination.hasMore ? lastPage.meta.pagination.cursor : undefined,
    });

  const items = data?.pages.flatMap((page) => page.data) ?? [];

  return {
    items,
    isPending,
    error,
    fetchNextPage,
    hasNextPage: hasNextPage ?? false,
    isFetchingNextPage,
  };
}

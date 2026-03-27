'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type {
  ApiSuccessResponse,
  NewspaperItemVoteResultDto,
  NewspaperItemBatchVoteStatusDto,
} from '@edin/shared';

export function useCastItemVote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const response = await apiClient<ApiSuccessResponse<NewspaperItemVoteResultDto>>(
        `/api/v1/newspaper/items/${itemId}/votes`,
        { method: 'POST' },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newspaper'] });
      queryClient.invalidateQueries({ queryKey: ['newspaper-item-votes'] });
    },
  });
}

export function useVotedItemIds(itemIds: string[]) {
  const sortedIds = [...itemIds].sort().join(',');

  return useQuery({
    queryKey: ['newspaper-item-votes', 'batch', sortedIds],
    queryFn: async () => {
      const response = await apiClient<ApiSuccessResponse<NewspaperItemBatchVoteStatusDto>>(
        `/api/v1/newspaper/items/votes/batch?ids=${sortedIds}`,
      );
      return response.data.votedItemIds;
    },
    enabled: itemIds.length > 0,
    staleTime: 60_000,
  });
}

export function isItemVoted(votedItemIds: string[], itemId: string): boolean {
  return votedItemIds.includes(itemId);
}

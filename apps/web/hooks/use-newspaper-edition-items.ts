import { useQuery } from '@tanstack/react-query';
import type { NewspaperEditionItemsResponse, ApiSuccessResponse } from '@edin/shared';
import { apiClient } from '../lib/api-client';

/**
 * Fetches items and channel data for a specific newspaper edition,
 * with optional multi-channel filtering.
 * Used for edition navigation (np-4-7) with filter persistence.
 * For the latest edition, items come from SSR / useNewspaperLatest.
 */
export function useNewspaperEditionItems(editionId: string | null, channelIds?: string[]) {
  return useQuery<NewspaperEditionItemsResponse>({
    queryKey: ['newspaper', 'editions', editionId, 'items', channelIds],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (channelIds?.length) {
        params.set('channelId', channelIds.join(','));
      }
      const qs = params.toString();
      const url = `/api/v1/newspaper/editions/${editionId}/items${qs ? `?${qs}` : ''}`;
      const response = await apiClient<ApiSuccessResponse<NewspaperEditionItemsResponse>>(url);
      return response.data;
    },
    enabled: !!editionId,
    staleTime: 60_000,
  });
}

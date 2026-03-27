import { useQuery } from '@tanstack/react-query';
import type { NewspaperEditionDto, ApiSuccessResponse } from '@edin/shared';
import { apiClient } from '../lib/api-client';

export function useNewspaperEditions(options?: { limit?: number }) {
  return useQuery<NewspaperEditionDto[]>({
    queryKey: ['newspaper', 'editions', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.limit) params.set('limit', String(options.limit));
      const response = await apiClient<ApiSuccessResponse<NewspaperEditionDto[]>>(
        `/api/v1/newspaper/editions?${params}`,
      );
      return response.data;
    },
    staleTime: 60_000,
  });
}

import { useQuery } from '@tanstack/react-query';
import type { NewspaperEditionWithItemsDto, ApiSuccessResponse } from '@edin/shared';
import { apiClient } from '../lib/api-client';

export function useNewspaperLatest() {
  const { data, isLoading, error } = useQuery<NewspaperEditionWithItemsDto>({
    queryKey: ['newspaper', 'latest'],
    queryFn: async () => {
      const response = await apiClient<ApiSuccessResponse<NewspaperEditionWithItemsDto>>(
        '/api/v1/newspaper/editions/latest',
      );
      return response.data;
    },
    staleTime: 60_000,
    retry: false,
  });

  return { edition: data ?? null, isLoading, error };
}

import { useQuery } from '@tanstack/react-query';
import type { ReferenceScaleDto, ApiSuccessResponse } from '@edin/shared';
import { apiClient } from '../lib/api-client';

export function useEditionScale(editionId: string | null) {
  return useQuery<ReferenceScaleDto>({
    queryKey: ['newspaper', 'editions', editionId, 'scale'],
    queryFn: async () => {
      const response = await apiClient<ApiSuccessResponse<ReferenceScaleDto>>(
        `/api/v1/newspaper/editions/${editionId}/scale`,
      );
      return response.data;
    },
    enabled: !!editionId,
    staleTime: 60_000,
  });
}

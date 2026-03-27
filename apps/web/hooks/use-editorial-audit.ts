'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { EditorialAuditEntryDto } from '@edin/shared';

interface ApiResponse {
  data: EditorialAuditEntryDto[];
}

export function useEditorialAudit(editionId: string | null, enabled = false) {
  return useQuery<EditorialAuditEntryDto[]>({
    queryKey: ['newspaper', 'editions', editionId, 'audit'],
    queryFn: async () => {
      const response = await apiClient<ApiResponse>(
        `/api/v1/newspaper/editions/${editionId}/audit`,
      );
      return response.data;
    },
    enabled: !!editionId && enabled,
    staleTime: 30_000,
  });
}

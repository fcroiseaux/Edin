'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { SystemAlert } from '@edin/shared';

interface AlertsResponse {
  data: SystemAlert[];
  meta: { timestamp: string; correlationId: string };
}

interface DismissResponse {
  data: { dismissed: boolean };
  meta: { timestamp: string; correlationId: string };
}

export function useAlerts() {
  const { data, isLoading, error } = useQuery<AlertsResponse>({
    queryKey: ['admin', 'alerts'],
    queryFn: () => apiClient<AlertsResponse>('/api/v1/admin/health/alerts'),
    refetchInterval: 30_000,
  });

  return {
    alerts: data?.data ?? [],
    isLoading,
    error,
  };
}

export function useDismissAlert() {
  const queryClient = useQueryClient();

  return useMutation<DismissResponse, Error, string>({
    mutationFn: (alertId) =>
      apiClient<DismissResponse>(`/api/v1/admin/health/alerts/${alertId}/dismiss`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'alerts'] });
    },
  });
}

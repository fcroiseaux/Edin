'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { ZenhubConfigResponse } from '@edin/shared';

interface ConfigApiResponse {
  data: ZenhubConfigResponse;
  meta: { timestamp: string; correlationId: string };
}

export function useZenhubConfig() {
  const { data, isLoading, error } = useQuery<ConfigApiResponse>({
    queryKey: ['admin', 'zenhub-config'],
    queryFn: () => apiClient<ConfigApiResponse>('/api/v1/admin/zenhub-config'),
    staleTime: 60_000,
  });

  return {
    config: data?.data ?? null,
    isLoading,
    error,
  };
}

export function useUpdateZenhubConfig() {
  const queryClient = useQueryClient();

  return useMutation<
    ConfigApiResponse,
    Error,
    {
      apiToken?: string;
      webhookUrl?: string;
      webhookSecret?: string;
      pollingIntervalMs?: number;
      workspaceMapping?: Record<string, string>;
    }
  >({
    mutationFn: (updates) =>
      apiClient<ConfigApiResponse>('/api/v1/admin/zenhub-config', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'zenhub-config'] });
    },
  });
}

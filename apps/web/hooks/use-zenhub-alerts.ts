'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type {
  SystemAlert,
  ZenhubAlertConfig,
  ZenhubSyncConflictEntry,
  PaginationMeta,
  ResolveZenhubSyncConflictInput,
} from '@edin/shared';

interface AlertsApiResponse {
  data: SystemAlert[];
  meta: { timestamp: string; correlationId: string };
}

interface AlertConfigApiResponse {
  data: ZenhubAlertConfig;
  meta: { timestamp: string; correlationId: string };
}

interface ConflictsApiResponse {
  data: ZenhubSyncConflictEntry[];
  meta: { timestamp: string; correlationId: string; pagination?: PaginationMeta };
}

function buildParams(filters: Record<string, string | number | undefined>): string {
  const entries = Object.entries(filters).filter(([, v]) => v !== undefined && v !== '');
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

export function useZenhubAlerts() {
  const { data, isLoading, error } = useQuery<AlertsApiResponse>({
    queryKey: ['admin', 'zenhub-alerts'],
    queryFn: () => apiClient<AlertsApiResponse>('/api/v1/admin/zenhub-alerts'),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return {
    alerts: data?.data ?? [],
    isLoading,
    error,
  };
}

export function useZenhubAlertConfig() {
  const { data, isLoading, error } = useQuery<AlertConfigApiResponse>({
    queryKey: ['admin', 'zenhub-alert-config'],
    queryFn: () => apiClient<AlertConfigApiResponse>('/api/v1/admin/zenhub-alerts/config'),
    staleTime: 60_000,
  });

  return {
    config: data?.data ?? null,
    isLoading,
    error,
  };
}

export function useUpdateZenhubAlertConfig() {
  const queryClient = useQueryClient();

  return useMutation<
    AlertConfigApiResponse,
    Error,
    { webhookFailureThreshold?: number; pollingTimeoutMinutes?: number; enabled?: boolean }
  >({
    mutationFn: (updates) =>
      apiClient<AlertConfigApiResponse>('/api/v1/admin/zenhub-alerts/config', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'zenhub-alert-config'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'zenhub-alerts'] });
    },
  });
}

export function useDismissZenhubAlert() {
  const queryClient = useQueryClient();

  return useMutation<{ data: { dismissed: boolean } }, Error, string>({
    mutationFn: (alertId) =>
      apiClient(`/api/v1/admin/zenhub-alerts/dismiss/${alertId}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'zenhub-alerts'] });
    },
  });
}

export function useZenhubSyncConflicts(filters?: {
  resolution?: string;
  startDate?: string;
  endDate?: string;
  cursor?: string;
  limit?: number;
}) {
  const params = buildParams({
    resolution: filters?.resolution,
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    cursor: filters?.cursor,
    limit: filters?.limit,
  });

  const { data, isLoading, isFetching, error } = useQuery<ConflictsApiResponse>({
    queryKey: [
      'admin',
      'zenhub-sync-conflicts',
      filters?.resolution,
      filters?.startDate,
      filters?.endDate,
      filters?.cursor,
    ],
    queryFn: () =>
      apiClient<ConflictsApiResponse>(`/api/v1/admin/zenhub-alerts/conflicts${params}`),
    staleTime: 30_000,
  });

  return {
    conflicts: data?.data ?? [],
    pagination: data?.meta?.pagination ?? null,
    isLoading,
    isFetching,
    error,
  };
}

interface ResolveConflictApiResponse {
  data: ZenhubSyncConflictEntry;
  meta: { timestamp: string; correlationId: string };
}

export function useResolveConflict() {
  const queryClient = useQueryClient();

  return useMutation<
    ResolveConflictApiResponse,
    Error,
    { conflictId: string; input: ResolveZenhubSyncConflictInput }
  >({
    mutationFn: ({ conflictId, input }) =>
      apiClient<ResolveConflictApiResponse>(
        `/api/v1/admin/zenhub-alerts/conflicts/${conflictId}/resolve`,
        {
          method: 'PATCH',
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'zenhub-sync-conflicts'] });
    },
  });
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { ZenhubSyncLogEntry, IntegrationHealthSummary, PaginationMeta } from '@edin/shared';

interface SyncLogsApiResponse {
  data: ZenhubSyncLogEntry[];
  meta: { timestamp: string; correlationId: string; pagination?: PaginationMeta };
}

interface HealthApiResponse {
  data: IntegrationHealthSummary;
  meta: { timestamp: string; correlationId: string };
}

function buildParams(filters: Record<string, string | number | undefined>): string {
  const entries = Object.entries(filters).filter(([, v]) => v !== undefined && v !== '');
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

export function useZenhubSyncLogs(filters?: {
  syncType?: string;
  status?: string;
  eventType?: string;
  startDate?: string;
  endDate?: string;
  correlationId?: string;
  cursor?: string;
  limit?: number;
}) {
  const params = buildParams({
    syncType: filters?.syncType,
    status: filters?.status,
    eventType: filters?.eventType,
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    correlationId: filters?.correlationId,
    cursor: filters?.cursor,
    limit: filters?.limit,
  });

  const { data, isLoading, isFetching, error } = useQuery<SyncLogsApiResponse>({
    queryKey: [
      'admin',
      'zenhub-sync-logs',
      filters?.syncType,
      filters?.status,
      filters?.eventType,
      filters?.startDate,
      filters?.endDate,
      filters?.correlationId,
      filters?.cursor,
    ],
    queryFn: () => apiClient<SyncLogsApiResponse>(`/api/v1/admin/zenhub-sync-logs${params}`),
    staleTime: 30_000,
  });

  return {
    logs: data?.data ?? [],
    pagination: data?.meta?.pagination ?? null,
    isLoading,
    isFetching,
    error,
  };
}

export function useIntegrationHealth() {
  const { data, isLoading, error } = useQuery<HealthApiResponse>({
    queryKey: ['admin', 'zenhub-integration-health'],
    queryFn: () => apiClient<HealthApiResponse>('/api/v1/admin/zenhub-sync-logs/health'),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  return {
    health: data?.data ?? null,
    isLoading,
    error,
  };
}

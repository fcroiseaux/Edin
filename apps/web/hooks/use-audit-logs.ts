'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { AuditLogEntry, AuditLogListResponse, PaginationMeta } from '@edin/shared';

interface AuditLogsApiResponse {
  data: AuditLogEntry[];
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

export interface AuditLogQueryParams {
  eventType?: string;
  actorId?: string;
  targetId?: string;
  startDate?: string;
  endDate?: string;
  correlationId?: string;
  cursor?: string;
}

export function useAuditLogs(params: AuditLogQueryParams) {
  const { data, isLoading, error, isFetching } = useQuery<AuditLogsApiResponse>({
    queryKey: ['admin', 'audit-logs', params],
    queryFn: () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) searchParams.set(key, value);
      });
      const qs = searchParams.toString();
      return apiClient<AuditLogsApiResponse>(`/api/v1/admin/audit-logs${qs ? `?${qs}` : ''}`);
    },
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

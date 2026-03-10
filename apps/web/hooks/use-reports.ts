'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { GeneratedReport, ReportConfig, PaginationMeta } from '@edin/shared';

interface ReportsResponse {
  data: GeneratedReport[];
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

interface CreateReportResponse {
  data: GeneratedReport;
  meta: { timestamp: string; correlationId: string };
}

export function useReports() {
  const { data, isLoading, error } = useQuery<ReportsResponse>({
    queryKey: ['admin', 'reports'],
    queryFn: () => apiClient<ReportsResponse>('/api/v1/admin/reports'),
    staleTime: 30_000,
  });

  return {
    reports: data?.data ?? [],
    isLoading,
    error,
  };
}

export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation<CreateReportResponse, Error, ReportConfig>({
    mutationFn: (config) =>
      apiClient<CreateReportResponse>('/api/v1/admin/reports', {
        method: 'POST',
        body: JSON.stringify(config),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
    },
  });
}

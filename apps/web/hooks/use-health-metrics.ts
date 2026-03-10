'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { HealthMetrics } from '@edin/shared';

interface HealthMetricsResponse {
  data: HealthMetrics;
  meta: { timestamp: string; correlationId: string };
}

export function useHealthMetrics() {
  const { data, isLoading, error } = useQuery<HealthMetricsResponse>({
    queryKey: ['admin', 'health-metrics'],
    queryFn: () => apiClient<HealthMetricsResponse>('/api/v1/admin/health/metrics'),
    staleTime: 5 * 60 * 1000,
  });

  return {
    metrics: data?.data ?? null,
    isLoading,
    error,
  };
}

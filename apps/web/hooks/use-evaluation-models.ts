'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { EvaluationModelVersionDto, EvaluationModelMetricsDto } from '@edin/shared';

interface ModelListResponse {
  data: EvaluationModelVersionDto[];
  meta: { timestamp: string; correlationId: string };
}

interface ModelMetricsResponse {
  data: EvaluationModelMetricsDto;
  meta: { timestamp: string; correlationId: string };
}

export function useEvaluationModels() {
  const { data, isLoading, error, refetch } = useQuery<ModelListResponse>({
    queryKey: ['admin', 'evaluations', 'models'],
    queryFn: () => apiClient<ModelListResponse>('/api/v1/admin/evaluations/models'),
    staleTime: 30_000,
  });

  return {
    models: data?.data ?? [],
    isLoading,
    error,
    refetch,
  };
}

export function useEvaluationModelMetrics(modelId: string | null) {
  const { data, isLoading, error } = useQuery<ModelMetricsResponse>({
    queryKey: ['admin', 'evaluations', 'models', modelId, 'metrics'],
    queryFn: () => {
      if (!modelId) throw new Error('modelId is required');
      return apiClient<ModelMetricsResponse>(`/api/v1/admin/evaluations/models/${modelId}/metrics`);
    },
    enabled: !!modelId,
    staleTime: 60_000,
  });

  return {
    metrics: data?.data ?? null,
    isLoading,
    error,
  };
}

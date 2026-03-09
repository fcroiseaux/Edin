'use client';

import { useQuery } from '@tanstack/react-query';
import type { PublicEvaluationAggregateDto } from '@edin/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function usePublicEvaluationMetrics(initialData?: PublicEvaluationAggregateDto) {
  const { data, isLoading, error } = useQuery<PublicEvaluationAggregateDto>({
    queryKey: ['public', 'evaluation-aggregate'],
    initialData,
    staleTime: 5 * 60 * 1000, // 5 minutes client-side cache
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/public/evaluations/aggregate`);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error?.message || `API error: ${response.status}`);
      }

      const body = await response.json();
      return body.data;
    },
  });

  return { metrics: data ?? null, isLoading, error };
}

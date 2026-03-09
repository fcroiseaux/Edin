'use client';

import { useQuery } from '@tanstack/react-query';
import type { ContributorEvaluationSummaryDto } from '@edin/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useContributorPublicScores(contributorId: string, enabled: boolean) {
  const { data, isLoading, error } = useQuery<ContributorEvaluationSummaryDto | null>({
    queryKey: ['public', 'contributor-scores', contributorId],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/public/evaluations/contributor/${contributorId}`,
      );

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error?.message || `API error: ${response.status}`);
      }

      const body = await response.json();
      return body.data; // null when contributor has not consented
    },
  });

  return { scores: data ?? null, isLoading, error };
}

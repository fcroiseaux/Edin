'use client';

import { useQuery } from '@tanstack/react-query';
import type { PublicContributorProfile } from '@edin/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function usePublicProfile(contributorId: string) {
  const { data, isLoading, error } = useQuery<PublicContributorProfile>({
    queryKey: ['profile', 'public', contributorId],
    enabled: !!contributorId,
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/contributors/${contributorId}`);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error?.message || `API error: ${response.status}`);
      }

      const body = await response.json();
      return body.data;
    },
  });

  return { profile: data ?? null, isLoading, error };
}

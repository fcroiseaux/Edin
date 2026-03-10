'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { TrajectoryResponseDto, TrajectoryTimeRange, PaginationMeta } from '@edin/shared';

interface TrajectoryApiResponse {
  data: TrajectoryResponseDto;
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

export function useTrajectory(timeRange: TrajectoryTimeRange = 'year') {
  const { data, isLoading, error } = useQuery<TrajectoryApiResponse>({
    queryKey: ['rewards', 'trajectory', timeRange],
    queryFn: () =>
      apiClient<TrajectoryApiResponse>(`/api/v1/rewards/trajectory?timeRange=${timeRange}`),
    staleTime: 30_000,
  });

  return {
    trajectory: data?.data ?? null,
    isLoading,
    error,
  };
}

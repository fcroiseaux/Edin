'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface PrizeAward {
  id: string;
  prizeCategoryId?: string;
  prizeCategoryName: string;
  significanceLevel: number;
  channelId?: string;
  channelName: string;
  chathamHouseLabel: string;
  narrative: string;
  awardedAt: string;
  metadata?: Record<string, unknown>;
}

interface PrizeAwardsResponse {
  data: PrizeAward[];
  meta: { timestamp: string; correlationId: string };
}

interface PublicPrizeAward {
  id: string;
  prizeCategoryName: string;
  significanceLevel: number;
  channelName: string;
  chathamHouseLabel: string;
  narrative: string;
  awardedAt: string;
}

interface PublicPrizeAwardsResponse {
  data: PublicPrizeAward[];
  meta: { timestamp: string; correlationId: string };
}

interface AdminCategoryStat {
  prizeCategoryId: string;
  prizeCategoryName: string;
  count: number;
}

interface AdminChannelStat {
  channelId: string;
  channelName: string;
  count: number;
}

interface AdminRecentAward {
  id: string;
  contributorId: string;
  contributorName: string;
  prizeCategoryName: string;
  channelName: string;
  significanceLevel: number;
  narrative: string;
  awardedAt: string;
}

interface AdminOverview {
  totalByCategory: AdminCategoryStat[];
  totalByChannel: AdminChannelStat[];
  recentAwards: AdminRecentAward[];
  last30DaysCount: number;
}

interface AdminOverviewResponse {
  data: AdminOverview;
  meta: { timestamp: string; correlationId: string };
}

export function usePrizeAwards() {
  const { data, isLoading, error } = useQuery<PrizeAwardsResponse>({
    queryKey: ['prize-awards', 'me'],
    queryFn: () => apiClient<PrizeAwardsResponse>('/api/v1/prize-awards/me'),
  });

  return {
    awards: data?.data ?? [],
    isLoading,
    error,
  };
}

export function usePublicPrizeAwards(contributorId: string) {
  const { data, isLoading, error } = useQuery<PublicPrizeAwardsResponse>({
    queryKey: ['prize-awards', 'public', contributorId],
    queryFn: () =>
      apiClient<PublicPrizeAwardsResponse>(`/api/v1/prize-awards/contributor/${contributorId}`),
    enabled: !!contributorId,
  });

  return {
    awards: data?.data ?? [],
    isLoading,
    error,
  };
}

export function useAdminPrizeOverview() {
  const { data, isLoading, error } = useQuery<AdminOverviewResponse>({
    queryKey: ['prize-awards', 'admin-overview'],
    queryFn: () => apiClient<AdminOverviewResponse>('/api/v1/prize-awards/admin/overview'),
  });

  return {
    overview: data?.data ?? null,
    isLoading,
    error,
  };
}

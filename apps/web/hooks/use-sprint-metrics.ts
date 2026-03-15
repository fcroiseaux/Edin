'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type {
  VelocityDataPoint,
  SprintMetricDetail,
  SprintMetricSummary,
  BurndownDataPoint,
  ScopeChangeRecord,
  ContributorAccuracyTrend,
  CombinedContributorMetric,
  PersonalSprintMetrics,
} from '@edin/shared';

interface ApiResponse<T> {
  data: T;
  meta: {
    timestamp: string;
    correlationId: string;
    pagination?: { cursor?: string; hasMore: boolean };
  };
}

function buildParams(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

export function useSprintVelocity(options?: { domain?: string; limit?: number }) {
  const params = buildParams({
    domain: options?.domain,
    limit: options?.limit,
  });

  const { data, isLoading, error } = useQuery<ApiResponse<VelocityDataPoint[]>>({
    queryKey: ['admin', 'sprint-velocity', options?.domain, options?.limit],
    queryFn: () => apiClient<ApiResponse<VelocityDataPoint[]>>(`/api/v1/sprints/velocity${params}`),
    staleTime: 5 * 60_000,
  });

  return {
    velocityData: data?.data ?? [],
    isLoading,
    error,
  };
}

export function useSprintBurndown(sprintId: string | null, options?: { domain?: string }) {
  const params = buildParams({ domain: options?.domain });

  const { data, isLoading, error } = useQuery<ApiResponse<BurndownDataPoint[]>>({
    queryKey: ['admin', 'sprint-burndown', sprintId, options?.domain],
    queryFn: () =>
      apiClient<ApiResponse<BurndownDataPoint[]>>(`/api/v1/sprints/burndown/${sprintId}${params}`),
    staleTime: 5 * 60_000,
    enabled: !!sprintId,
  });

  return {
    burndownData: data?.data ?? [],
    isLoading,
    error,
  };
}

export function useSprintList(options?: { domain?: string; limit?: number; cursor?: string }) {
  const params = buildParams({
    domain: options?.domain,
    limit: options?.limit,
    cursor: options?.cursor,
  });

  const { data, isLoading, error } = useQuery<ApiResponse<SprintMetricSummary[]>>({
    queryKey: ['admin', 'sprint-list', options?.domain, options?.limit, options?.cursor],
    queryFn: () => apiClient<ApiResponse<SprintMetricSummary[]>>(`/api/v1/sprints${params}`),
    staleTime: 5 * 60_000,
  });

  return {
    sprints: data?.data ?? [],
    pagination: data?.meta.pagination,
    isLoading,
    error,
  };
}

export function useSprintDetail(id: string | null) {
  const { data, isLoading, error } = useQuery<ApiResponse<SprintMetricDetail>>({
    queryKey: ['admin', 'sprint-detail', id],
    queryFn: () => apiClient<ApiResponse<SprintMetricDetail>>(`/api/v1/sprints/${id}`),
    staleTime: 5 * 60_000,
    enabled: !!id,
  });

  return {
    sprint: data?.data ?? null,
    isLoading,
    error,
  };
}

export function useScopeChanges(sprintId: string | null, options?: { domain?: string }) {
  const params = buildParams({ domain: options?.domain });

  const { data, isLoading, error } = useQuery<ApiResponse<ScopeChangeRecord[]>>({
    queryKey: ['admin', 'scope-changes', sprintId, options?.domain],
    queryFn: () =>
      apiClient<ApiResponse<ScopeChangeRecord[]>>(
        `/api/v1/sprints/${sprintId}/scope-changes${params}`,
      ),
    staleTime: 5 * 60_000,
    enabled: !!sprintId,
  });

  return {
    scopeChanges: data?.data ?? [],
    isLoading,
    error,
  };
}

export function useContributorTrends(options?: { domain?: string; limit?: number }) {
  const params = buildParams({
    domain: options?.domain,
    limit: options?.limit,
  });

  const { data, isLoading, error } = useQuery<ApiResponse<ContributorAccuracyTrend[]>>({
    queryKey: ['admin', 'contributor-trends', options?.domain, options?.limit],
    queryFn: () =>
      apiClient<ApiResponse<ContributorAccuracyTrend[]>>(`/api/v1/sprints/contributors${params}`),
    staleTime: 5 * 60_000,
  });

  return {
    trends: data?.data ?? [],
    isLoading,
    error,
  };
}

export function useCombinedContributorMetrics(options?: { domain?: string; limit?: number }) {
  const params = buildParams({
    domain: options?.domain,
    limit: options?.limit,
  });

  const { data, isLoading, error } = useQuery<ApiResponse<CombinedContributorMetric[]>>({
    queryKey: ['admin', 'combined-contributor-metrics', options?.domain, options?.limit],
    queryFn: () =>
      apiClient<ApiResponse<CombinedContributorMetric[]>>(
        `/api/v1/sprints/contributors/combined${params}`,
      ),
    staleTime: 5 * 60_000,
  });

  return {
    metrics: data?.data ?? [],
    isLoading,
    error,
  };
}

export function usePersonalSprintMetrics(contributorId: string | null) {
  const { data, isLoading, error } = useQuery<ApiResponse<PersonalSprintMetrics>>({
    queryKey: ['dashboard', 'sprint-metrics', contributorId],
    queryFn: () =>
      apiClient<ApiResponse<PersonalSprintMetrics>>(
        `/api/v1/sprints/contributors/${contributorId}/metrics`,
      ),
    staleTime: 5 * 60_000,
    enabled: !!contributorId,
  });

  return {
    metrics: data?.data ?? null,
    isLoading,
    error,
  };
}

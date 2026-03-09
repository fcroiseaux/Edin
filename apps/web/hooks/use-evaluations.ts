'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type {
  EvaluationStatus,
  EvaluationWithContributionDto,
  EvaluationDetailDto,
  EvaluationHistoryItemDto,
  PaginationMeta,
} from '@edin/shared';

interface EvaluationStatusResponse {
  data: { status: EvaluationStatus | null };
  meta: { timestamp: string; correlationId: string };
}

interface EvaluationResponse {
  data: EvaluationDetailDto;
  meta: { timestamp: string; correlationId: string };
}

interface EvaluationHistoryResponse {
  data: EvaluationHistoryItemDto[];
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

interface EvaluationListResponse {
  data: EvaluationWithContributionDto[];
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

export function useEvaluationStatus(contributionId: string | null) {
  const { data, isLoading, error } = useQuery<EvaluationStatusResponse>({
    queryKey: ['evaluations', 'status', contributionId],
    queryFn: () => {
      if (!contributionId) throw new Error('contributionId is required');
      return apiClient<EvaluationStatusResponse>(
        `/api/v1/evaluations/contribution/${contributionId}/status`,
      );
    },
    enabled: !!contributionId,
    staleTime: 30_000,
    refetchInterval: (query) => {
      const status = query.state.data?.data.status;
      if (status === 'PENDING' || status === 'IN_PROGRESS') {
        return 60_000;
      }
      return false;
    },
  });

  return {
    status: data?.data.status ?? null,
    isLoading,
    error,
  };
}

export function useEvaluation(evaluationId: string | null) {
  const { data, isLoading, error } = useQuery<EvaluationResponse>({
    queryKey: ['evaluations', evaluationId],
    queryFn: () => {
      if (!evaluationId) throw new Error('evaluationId is required');
      return apiClient<EvaluationResponse>(`/api/v1/evaluations/${evaluationId}`);
    },
    enabled: !!evaluationId,
  });

  return {
    evaluation: data?.data ?? null,
    isLoading,
    error,
  };
}

export function useMyEvaluations() {
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<EvaluationListResponse>({
      queryKey: ['evaluations', 'mine'],
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams();
        params.set('limit', '20');
        if (typeof pageParam === 'string' && pageParam.length > 0) {
          params.set('cursor', pageParam);
        }
        const qs = params.toString();
        return apiClient<EvaluationListResponse>(`/api/v1/evaluations${qs ? `?${qs}` : ''}`);
      },
      initialPageParam: '',
      getNextPageParam: (lastPage) =>
        lastPage.meta.pagination.hasMore
          ? (lastPage.meta.pagination.cursor ?? undefined)
          : undefined,
      staleTime: 30_000,
    });

  const evaluations = data?.pages.flatMap((page) => page.data) ?? [];

  return {
    evaluations,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
}

export function useEvaluationHistory(filters: {
  contributionType?: string;
  from?: string;
  to?: string;
}) {
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<EvaluationHistoryResponse>({
      queryKey: ['evaluations', 'history', filters],
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams();
        params.set('limit', '20');
        if (typeof pageParam === 'string' && pageParam.length > 0) {
          params.set('cursor', pageParam);
        }
        if (filters.contributionType) {
          params.set('contributionType', filters.contributionType);
        }
        if (filters.from) {
          params.set('from', filters.from);
        }
        if (filters.to) {
          params.set('to', filters.to);
        }
        const qs = params.toString();
        return apiClient<EvaluationHistoryResponse>(
          `/api/v1/evaluations/history${qs ? `?${qs}` : ''}`,
        );
      },
      initialPageParam: '',
      getNextPageParam: (lastPage) =>
        lastPage.meta.pagination.hasMore
          ? (lastPage.meta.pagination.cursor ?? undefined)
          : undefined,
      staleTime: 30_000,
    });

  const items = data?.pages.flatMap((page) => page.data) ?? [];

  return {
    items,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
}

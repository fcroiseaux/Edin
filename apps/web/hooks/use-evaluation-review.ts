'use client';

import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type {
  EvaluationReviewStatus,
  EvaluationReviewQueueItemDto,
  EvaluationReviewDetailDto,
  AgreementRatesResponseDto,
  PaginationMeta,
} from '@edin/shared';

// ─── Response Types ──────────────────────────────────────────────────────────

interface FlagResponse {
  data: {
    id: string;
    evaluationId: string;
    status: EvaluationReviewStatus;
    flagReason: string;
    flaggedAt: string;
  };
  meta: { timestamp: string; correlationId: string };
}

interface ReviewStatusResponse {
  data: {
    id: string;
    status: EvaluationReviewStatus;
    flaggedAt: string;
    resolvedAt: string | null;
  } | null;
  meta: { timestamp: string; correlationId: string };
}

interface ReviewQueueResponse {
  data: EvaluationReviewQueueItemDto[];
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

interface ReviewDetailResponse {
  data: EvaluationReviewDetailDto;
  meta: { timestamp: string; correlationId: string };
}

interface ResolveResponse {
  data: {
    id: string;
    status: EvaluationReviewStatus;
    reviewReason: string;
    resolvedAt: string | null;
  };
  meta: { timestamp: string; correlationId: string };
}

interface AgreementRatesResponse {
  data: AgreementRatesResponseDto;
  meta: { timestamp: string; correlationId: string };
}

// ─── Contributor Hooks ───────────────────────────────────────────────────────

export function useReviewStatus(evaluationId: string | null) {
  const { data, isLoading, error } = useQuery<ReviewStatusResponse>({
    queryKey: ['evaluations', 'review-status', evaluationId],
    queryFn: () => {
      if (!evaluationId) throw new Error('evaluationId is required');
      return apiClient<ReviewStatusResponse>(`/api/v1/evaluations/${evaluationId}/review-status`);
    },
    enabled: !!evaluationId,
    staleTime: 30_000,
  });

  return {
    reviewStatus: data?.data ?? null,
    isLoading,
    error,
  };
}

export function useFlagEvaluation() {
  const queryClient = useQueryClient();

  return useMutation<FlagResponse, Error, { evaluationId: string; flagReason: string }>({
    mutationFn: ({ evaluationId, flagReason }) =>
      apiClient<FlagResponse>(`/api/v1/evaluations/${evaluationId}/flag`, {
        method: 'POST',
        body: JSON.stringify({ flagReason }),
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['evaluations', 'review-status', variables.evaluationId],
      });
    },
  });
}

// ─── Admin Hooks ─────────────────────────────────────────────────────────────

export function useReviewQueue(filters: { domain?: string; status?: string }) {
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<ReviewQueueResponse>({
      queryKey: ['admin', 'evaluation-reviews', filters],
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams();
        params.set('limit', '20');
        if (typeof pageParam === 'string' && pageParam.length > 0) {
          params.set('cursor', pageParam);
        }
        if (filters.domain) params.set('domain', filters.domain);
        if (filters.status) params.set('status', filters.status);
        const qs = params.toString();
        return apiClient<ReviewQueueResponse>(
          `/api/v1/admin/evaluations/reviews${qs ? `?${qs}` : ''}`,
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

  return { items, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage };
}

export function useReviewDetail(reviewId: string | null) {
  const { data, isLoading, error } = useQuery<ReviewDetailResponse>({
    queryKey: ['admin', 'evaluation-reviews', reviewId],
    queryFn: () => {
      if (!reviewId) throw new Error('reviewId is required');
      return apiClient<ReviewDetailResponse>(`/api/v1/admin/evaluations/reviews/${reviewId}`);
    },
    enabled: !!reviewId,
  });

  return {
    review: data?.data ?? null,
    isLoading,
    error,
  };
}

export function useResolveReview() {
  const queryClient = useQueryClient();

  return useMutation<
    ResolveResponse,
    Error,
    {
      reviewId: string;
      action: 'confirm' | 'override';
      reviewReason: string;
      overrideScores?: {
        compositeScore: number;
        dimensionScores: Record<string, { score: number; explanation: string }>;
      };
      overrideNarrative?: string;
    }
  >({
    mutationFn: ({ reviewId, ...body }) =>
      apiClient<ResolveResponse>(`/api/v1/admin/evaluations/reviews/${reviewId}/resolve`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'evaluation-reviews'] });
    },
  });
}

export function useAgreementRates(modelId?: string) {
  const { data, isLoading, error } = useQuery<AgreementRatesResponse>({
    queryKey: ['admin', 'agreement-rates', modelId],
    queryFn: () => {
      const params = modelId ? `?modelId=${encodeURIComponent(modelId)}` : '';
      return apiClient<AgreementRatesResponse>(
        `/api/v1/admin/evaluations/agreement-rates${params}`,
      );
    },
    staleTime: 60_000,
  });

  return {
    rates: data?.data ?? null,
    isLoading,
    error,
  };
}

'use client';

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type {
  ArticleDto,
  ArticleListItemDto,
  CreateArticleDto,
  UpdateArticleDto,
  ApiSuccessResponse,
  PaginationMeta,
} from '@edin/shared';

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useArticle(id: string | undefined) {
  const { data, isLoading, error } = useQuery<ArticleDto>({
    queryKey: ['articles', id],
    enabled: !!id,
    queryFn: async () => {
      const response = await apiClient<ApiSuccessResponse<ArticleDto>>(`/api/v1/articles/${id}`);
      return response.data;
    },
  });

  return { article: data ?? null, isLoading, error };
}

interface DraftsPageResponse {
  data: ArticleListItemDto[];
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

export function useArticleDrafts() {
  const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<DraftsPageResponse>({
      queryKey: ['articles', 'drafts'],
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams({ status: 'DRAFT', limit: '20' });
        if (pageParam) params.set('cursor', pageParam as string);

        return apiClient<DraftsPageResponse>(`/api/v1/articles?${params.toString()}`);
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage.meta.pagination.hasMore ? lastPage.meta.pagination.cursor : undefined,
    });

  const drafts = data?.pages.flatMap((page) => page.data) ?? [];

  return {
    drafts,
    isPending,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateArticle() {
  const queryClient = useQueryClient();

  return useMutation<ArticleDto, Error, CreateArticleDto>({
    mutationFn: async (data) => {
      const response = await apiClient<ApiSuccessResponse<ArticleDto>>('/api/v1/articles', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles', 'drafts'] });
    },
  });
}

export function useUpdateArticle(id: string | undefined) {
  return useMutation<ArticleDto, Error, UpdateArticleDto>({
    mutationFn: async (data) => {
      const response = await apiClient<ApiSuccessResponse<ArticleDto>>(`/api/v1/articles/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return response.data;
    },
  });
}

export function useSubmitArticle() {
  const queryClient = useQueryClient();

  return useMutation<ArticleDto, Error, string>({
    mutationFn: async (id) => {
      const response = await apiClient<ApiSuccessResponse<ArticleDto>>(
        `/api/v1/articles/${id}/submit`,
        { method: 'POST' },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });
}

export function useDeleteArticle() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await apiClient(`/api/v1/articles/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles', 'drafts'] });
    },
  });
}

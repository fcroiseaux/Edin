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
  EditorialViewDto,
  EditorialFeedbackDto,
  AuthorRevisionViewDto,
  ArticleVersionDto,
  EditorialFeedbackInput,
  PublicArticleListItemDto,
  PublicArticleDetailDto,
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

// ─── Editorial Queries ───────────────────────────────────────────────────────

export function useEditorialView(articleId: string | undefined) {
  const { data, isLoading, error } = useQuery<EditorialViewDto>({
    queryKey: ['articles', articleId, 'editorial'],
    enabled: !!articleId,
    queryFn: async () => {
      const response = await apiClient<ApiSuccessResponse<EditorialViewDto>>(
        `/api/v1/articles/${articleId}/editorial`,
      );
      return response.data;
    },
  });

  return { editorialView: data ?? null, isLoading, error };
}

export function useAuthorRevisionView(articleId: string | undefined) {
  const { data, isLoading, error } = useQuery<AuthorRevisionViewDto>({
    queryKey: ['articles', articleId, 'revisions'],
    enabled: !!articleId,
    queryFn: async () => {
      const response = await apiClient<ApiSuccessResponse<AuthorRevisionViewDto>>(
        `/api/v1/articles/${articleId}/revisions`,
      );
      return response.data;
    },
  });

  return { revisionView: data ?? null, isLoading, error };
}

export function useArticleVersions(articleId: string | undefined) {
  const { data, isLoading, error } = useQuery<ArticleVersionDto[]>({
    queryKey: ['articles', articleId, 'versions'],
    enabled: !!articleId,
    queryFn: async () => {
      const response = await apiClient<ApiSuccessResponse<ArticleVersionDto[]>>(
        `/api/v1/articles/${articleId}/versions`,
      );
      return response.data;
    },
  });

  return { versions: data ?? [], isLoading, error };
}

export function useArticleVersion(articleId: string | undefined, version: number | null) {
  const { data, isLoading, error } = useQuery<ArticleVersionDto>({
    queryKey: ['articles', articleId, 'versions', version],
    enabled: !!articleId && version !== null,
    queryFn: async () => {
      const response = await apiClient<ApiSuccessResponse<ArticleVersionDto>>(
        `/api/v1/articles/${articleId}/versions/${version}`,
      );
      return response.data;
    },
  });

  return { versionData: data ?? null, isLoading, error };
}

// ─── Editorial Mutations ─────────────────────────────────────────────────────

export function useSubmitFeedback() {
  const queryClient = useQueryClient();

  return useMutation<
    EditorialFeedbackDto,
    Error,
    { articleId: string; data: EditorialFeedbackInput }
  >({
    mutationFn: async ({ articleId, data }) => {
      const response = await apiClient<ApiSuccessResponse<EditorialFeedbackDto>>(
        `/api/v1/articles/${articleId}/feedback`,
        { method: 'POST', body: JSON.stringify(data) },
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['articles', variables.articleId] });
    },
  });
}

export function useResubmitArticle() {
  const queryClient = useQueryClient();

  return useMutation<ArticleDto, Error, { articleId: string; body: string }>({
    mutationFn: async ({ articleId, body }) => {
      const response = await apiClient<ApiSuccessResponse<ArticleDto>>(
        `/api/v1/articles/${articleId}/resubmit`,
        { method: 'POST', body: JSON.stringify({ body }) },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });
}

export function usePublishArticle() {
  const queryClient = useQueryClient();

  return useMutation<ArticleDto, Error, string>({
    mutationFn: async (articleId) => {
      const response = await apiClient<ApiSuccessResponse<ArticleDto>>(
        `/api/v1/articles/${articleId}/publish`,
        { method: 'POST' },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['articles'] });
    },
  });
}

// ─── All Articles Query ──────────────────────────────────────────────────────

interface ArticlesPageResponse {
  data: ArticleListItemDto[];
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

export function useAllArticles(status?: string) {
  const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<ArticlesPageResponse>({
      queryKey: ['articles', 'list', status],
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams({ limit: '20' });
        if (status) params.set('status', status);
        if (pageParam) params.set('cursor', pageParam as string);

        return apiClient<ArticlesPageResponse>(`/api/v1/articles?${params.toString()}`);
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage.meta.pagination.hasMore ? lastPage.meta.pagination.cursor : undefined,
    });

  const articles = data?.pages.flatMap((page) => page.data) ?? [];

  return { articles, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage };
}

// ─── Public Article Queries ──────────────────────────────────────────────────

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface PublicArticlesPageResponse {
  data: PublicArticleListItemDto[];
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

export function usePublicArticles(filters?: {
  domain?: string;
  initialData?: { articles: PublicArticleListItemDto[]; total: number };
}) {
  const { data, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery<PublicArticlesPageResponse>({
      queryKey: ['articles', 'published', filters?.domain],
      queryFn: async ({ pageParam }) => {
        const params = new URLSearchParams({ limit: '20' });
        if (filters?.domain) params.set('domain', filters.domain);
        if (pageParam) params.set('cursor', pageParam as string);

        const response = await fetch(
          `${API_BASE_URL}/api/v1/articles/published?${params.toString()}`,
        );
        if (!response.ok) throw new Error(`Failed to fetch articles: ${response.status}`);
        return response.json();
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        lastPage.meta.pagination.hasMore ? lastPage.meta.pagination.cursor : undefined,
      ...(filters?.initialData && filters.initialData.articles.length > 0
        ? {
            initialData: {
              pages: [
                {
                  data: filters.initialData.articles,
                  meta: {
                    timestamp: new Date().toISOString(),
                    correlationId: '',
                    pagination: {
                      cursor: null,
                      hasMore: filters.initialData.total > filters.initialData.articles.length,
                      total: filters.initialData.total,
                    },
                  },
                },
              ],
              pageParams: [undefined],
            },
          }
        : {}),
    });

  const articles = data?.pages.flatMap((page) => page.data) ?? [];

  return { articles, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage };
}

export function usePublicArticle(slug: string | undefined) {
  const { data, isLoading, error } = useQuery<PublicArticleDetailDto>({
    queryKey: ['articles', 'published', slug],
    enabled: !!slug,
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/v1/articles/published/${slug}`);
      if (!response.ok) throw new Error(`Failed to fetch article: ${response.status}`);
      const body: ApiSuccessResponse<PublicArticleDetailDto> = await response.json();
      return body.data;
    },
  });

  return { article: data ?? null, isLoading, error };
}

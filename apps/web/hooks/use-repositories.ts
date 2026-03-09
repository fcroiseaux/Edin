'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { MonitoredRepositoryType, PaginationMeta } from '@edin/shared';

interface RepositoryListResponse {
  data: MonitoredRepositoryType[];
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

interface RepositoryResponse {
  data: MonitoredRepositoryType;
  meta: { timestamp: string; correlationId: string };
}

export function useRepositories() {
  const { data, isLoading, error, refetch } = useQuery<RepositoryListResponse>({
    queryKey: ['ingestion', 'repositories'],
    queryFn: async () => {
      return apiClient<RepositoryListResponse>('/api/v1/ingestion/repositories?limit=50');
    },
    staleTime: 30_000,
  });

  const repositories = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  return { repositories, pagination, isLoading, error, refetch };
}

export function useAddRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { owner: string; repo: string }) => {
      return apiClient<RepositoryResponse>('/api/v1/ingestion/repositories', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onMutate: async (newRepo) => {
      await queryClient.cancelQueries({ queryKey: ['ingestion', 'repositories'] });

      const previousData = queryClient.getQueryData<RepositoryListResponse>([
        'ingestion',
        'repositories',
      ]);

      const optimisticRepo: MonitoredRepositoryType = {
        id: `optimistic-${Date.now()}`,
        owner: newRepo.owner,
        repo: newRepo.repo,
        fullName: `${newRepo.owner}/${newRepo.repo}`,
        webhookId: null,
        status: 'PENDING',
        statusMessage: null,
        addedById: '',
        addedByName: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<RepositoryListResponse>(['ingestion', 'repositories'], (old) =>
        old
          ? { ...old, data: [optimisticRepo, ...old.data] }
          : {
              data: [optimisticRepo],
              meta: {
                timestamp: new Date().toISOString(),
                correlationId: '',
                pagination: { cursor: null, hasMore: false, total: 1 },
              },
            },
      );

      return { previousData };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['ingestion', 'repositories'], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ingestion', 'repositories'] });
    },
  });
}

export function useRemoveRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient<{ data: { deleted: boolean } }>(`/api/v1/ingestion/repositories/${id}`, {
        method: 'DELETE',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ingestion', 'repositories'] });
    },
  });
}

export function useRetryWebhook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient<RepositoryResponse>(`/api/v1/ingestion/repositories/${id}/retry`, {
        method: 'POST',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ingestion', 'repositories'] });
    },
  });
}

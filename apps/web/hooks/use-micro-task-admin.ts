'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { MicroTask, PaginationMeta } from '@edin/shared';

interface MicroTaskListResponse {
  data: MicroTask[];
  meta: { timestamp: string; correlationId: string; pagination: PaginationMeta };
}

interface MicroTaskResponse {
  data: MicroTask;
  meta: { timestamp: string; correlationId: string };
}

interface UseMicroTaskListOptions {
  domain?: string;
  isActive?: boolean;
}

export function useMicroTaskList({ domain, isActive }: UseMicroTaskListOptions = {}) {
  const { data, isLoading, error, refetch } = useQuery<MicroTaskListResponse>({
    queryKey: ['admission', 'micro-tasks', { domain, isActive }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (domain) params.set('domain', domain);
      if (isActive !== undefined) params.set('isActive', String(isActive));
      params.set('limit', '50');

      const qs = params.toString();
      return apiClient<MicroTaskListResponse>(`/api/v1/admission/micro-tasks${qs ? `?${qs}` : ''}`);
    },
    staleTime: 30_000,
  });

  const microTasks = data?.data ?? [];
  const pagination = data?.meta?.pagination;

  return { microTasks, pagination, isLoading, error, refetch };
}

export function useMicroTaskDetail(id: string | null) {
  const { microTasks, isLoading } = useMicroTaskList();

  const microTask = id ? (microTasks.find((t) => t.id === id) ?? null) : null;

  return { microTask, isLoading };
}

export function useCreateMicroTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      domain: string;
      title: string;
      description: string;
      expectedDeliverable: string;
      estimatedEffort: string;
      submissionFormat: string;
    }) => {
      return apiClient<MicroTaskResponse>('/api/v1/admission/micro-tasks', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admission', 'micro-tasks'] });
    },
  });
}

export function useUpdateMicroTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      description?: string;
      expectedDeliverable?: string;
      estimatedEffort?: string;
      submissionFormat?: string;
      isActive?: boolean;
    }) => {
      return apiClient<MicroTaskResponse>(`/api/v1/admission/micro-tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admission', 'micro-tasks'] });
    },
  });
}

export function useDeactivateMicroTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      return apiClient<MicroTaskResponse>(`/api/v1/admission/micro-tasks/${id}/deactivate`, {
        method: 'DELETE',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admission', 'micro-tasks'] });
    },
  });
}

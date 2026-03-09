'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { WorkingGroup, WorkingGroupDetail } from '@edin/shared';

interface WorkingGroupsResponse {
  data: WorkingGroup[];
  meta: { timestamp: string; correlationId: string };
}

interface WorkingGroupDetailResponse {
  data: WorkingGroupDetail & {
    recentContributions: Array<{
      id: string;
      title: string;
      contributionType: string;
      createdAt: string;
      contributor: { id: string; name: string; avatarUrl: string | null };
      repository: { fullName: string };
    }>;
  };
  meta: { timestamp: string; correlationId: string };
}

interface JoinLeaveResponse {
  data: {
    id?: string;
    workingGroupId?: string;
    contributorId?: string;
    joinedAt?: string;
    message?: string;
  };
  meta: { timestamp: string; correlationId: string };
}

export function useWorkingGroups() {
  const { data, isLoading, error } = useQuery<WorkingGroupsResponse>({
    queryKey: ['working-groups'],
    queryFn: () => apiClient<WorkingGroupsResponse>('/api/v1/working-groups'),
    staleTime: 30_000,
  });

  return {
    workingGroups: data?.data ?? [],
    isLoading,
    error,
  };
}

export function useWorkingGroupDetail(id: string) {
  const { data, isLoading, error } = useQuery<WorkingGroupDetailResponse>({
    queryKey: ['working-groups', id],
    queryFn: () => apiClient<WorkingGroupDetailResponse>(`/api/v1/working-groups/${id}`),
    staleTime: 30_000,
    enabled: Boolean(id),
  });

  return {
    workingGroup: data?.data ?? null,
    isLoading,
    error,
  };
}

export function useJoinWorkingGroup() {
  const queryClient = useQueryClient();

  return useMutation<JoinLeaveResponse, Error, string>({
    mutationFn: (workingGroupId: string) =>
      apiClient<JoinLeaveResponse>(`/api/v1/working-groups/${workingGroupId}/members`, {
        method: 'POST',
      }),
    onMutate: async (workingGroupId) => {
      await queryClient.cancelQueries({ queryKey: ['working-groups'] });
      await queryClient.cancelQueries({ queryKey: ['working-groups', workingGroupId] });

      const previousGroups = queryClient.getQueryData<WorkingGroupsResponse>(['working-groups']);
      if (previousGroups) {
        queryClient.setQueryData<WorkingGroupsResponse>(['working-groups'], {
          ...previousGroups,
          data: previousGroups.data.map((g) =>
            g.id === workingGroupId ? { ...g, memberCount: g.memberCount + 1, isMember: true } : g,
          ),
        });
      }

      return { previousGroups };
    },
    onError: (_err, _workingGroupId, onMutateResult) => {
      const context = onMutateResult as { previousGroups?: WorkingGroupsResponse } | undefined;

      if (context?.previousGroups) {
        queryClient.setQueryData(['working-groups'], context.previousGroups);
      }
    },
    onSettled: (_data, _err, workingGroupId) => {
      queryClient.invalidateQueries({ queryKey: ['working-groups'] });
      queryClient.invalidateQueries({ queryKey: ['working-groups', workingGroupId] });
    },
  });
}

export function useLeaveWorkingGroup() {
  const queryClient = useQueryClient();

  return useMutation<JoinLeaveResponse, Error, string>({
    mutationFn: (workingGroupId: string) =>
      apiClient<JoinLeaveResponse>(`/api/v1/working-groups/${workingGroupId}/members`, {
        method: 'DELETE',
      }),
    onMutate: async (workingGroupId) => {
      await queryClient.cancelQueries({ queryKey: ['working-groups'] });
      await queryClient.cancelQueries({ queryKey: ['working-groups', workingGroupId] });

      const previousGroups = queryClient.getQueryData<WorkingGroupsResponse>(['working-groups']);
      if (previousGroups) {
        queryClient.setQueryData<WorkingGroupsResponse>(['working-groups'], {
          ...previousGroups,
          data: previousGroups.data.map((g) =>
            g.id === workingGroupId
              ? { ...g, memberCount: Math.max(0, g.memberCount - 1), isMember: false }
              : g,
          ),
        });
      }

      return { previousGroups };
    },
    onError: (_err, _workingGroupId, onMutateResult) => {
      const context = onMutateResult as { previousGroups?: WorkingGroupsResponse } | undefined;

      if (context?.previousGroups) {
        queryClient.setQueryData(['working-groups'], context.previousGroups);
      }
    },
    onSettled: (_data, _err, workingGroupId) => {
      queryClient.invalidateQueries({ queryKey: ['working-groups'] });
      queryClient.invalidateQueries({ queryKey: ['working-groups', workingGroupId] });
    },
  });
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface ContributorProfile {
  id: string;
  githubId: number;
  name: string;
  email: string | null;
  bio: string | null;
  avatarUrl: string | null;
  domain: string | null;
  skillAreas: string[];
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UpdateProfileData {
  name?: string;
  bio?: string;
  domain?: string;
  avatarUrl?: string;
  skillAreas?: string[];
}

export function useProfile() {
  const { data, isLoading, error } = useQuery<ContributorProfile>({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const response = await apiClient<{ data: ContributorProfile }>('/api/v1/contributors/me');
      return response.data;
    },
  });

  return { profile: data ?? null, isLoading, error };
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation<
    ContributorProfile,
    Error,
    UpdateProfileData,
    { previous: ContributorProfile | undefined }
  >({
    mutationFn: async (data) => {
      const response = await apiClient<{ data: ContributorProfile }>('/api/v1/contributors/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      return response.data;
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['profile', 'me'] });
      const previous = queryClient.getQueryData<ContributorProfile>(['profile', 'me']);
      queryClient.setQueryData<ContributorProfile>(['profile', 'me'], (old) =>
        old ? { ...old, ...newData } : old,
      );
      return { previous };
    },
    onError: (_err, _newData, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['profile', 'me'], context.previous);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', 'me'] });
    },
  });
}

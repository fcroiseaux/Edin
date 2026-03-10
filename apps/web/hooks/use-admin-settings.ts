'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { PlatformSettingsSection } from '@edin/shared';

interface AllSettingsResponse {
  data: { sections: PlatformSettingsSection[] };
  meta: { timestamp: string; correlationId: string };
}

interface SectionResponse {
  data: PlatformSettingsSection;
  meta: { timestamp: string; correlationId: string };
}

export function useAdminSettings() {
  const { data, isLoading, error } = useQuery<AllSettingsResponse>({
    queryKey: ['admin', 'settings'],
    queryFn: () => apiClient<AllSettingsResponse>('/api/v1/admin/settings'),
    staleTime: 60_000,
  });

  return {
    sections: data?.data?.sections ?? [],
    isLoading,
    error,
  };
}

export function useAdminSettingsSection(section: string) {
  const { data, isLoading, error } = useQuery<SectionResponse>({
    queryKey: ['admin', 'settings', section],
    queryFn: () => apiClient<SectionResponse>(`/api/v1/admin/settings/${section}`),
    staleTime: 60_000,
  });

  return {
    section: data?.data ?? null,
    isLoading,
    error,
  };
}

export function useUpdateAdminSettings() {
  const queryClient = useQueryClient();

  return useMutation<SectionResponse, Error, { section: string; updates: Record<string, unknown> }>(
    {
      mutationFn: ({ section, updates }) =>
        apiClient<SectionResponse>(`/api/v1/admin/settings/${section}`, {
          method: 'PATCH',
          body: JSON.stringify(updates),
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] });
      },
    },
  );
}

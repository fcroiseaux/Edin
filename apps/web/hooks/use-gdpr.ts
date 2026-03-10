'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { DataExportRequestDto, DataDeletionRequestDto } from '@edin/shared';

interface ApiResponse<T> {
  data: T;
  meta: { timestamp: string; correlationId: string };
}

export function useDataExportRequest() {
  const queryClient = useQueryClient();
  return useMutation<DataExportRequestDto, Error>({
    mutationFn: async () => {
      const json = await apiClient<ApiResponse<DataExportRequestDto>>(
        '/api/v1/contributors/me/data-export',
        { method: 'POST' },
      );
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataExport'] });
    },
  });
}

export function useDataExportStatus(requestId: string | null) {
  return useQuery({
    queryKey: ['dataExport', requestId],
    queryFn: async (): Promise<DataExportRequestDto> => {
      const json = await apiClient<ApiResponse<DataExportRequestDto>>(
        `/api/v1/contributors/me/data-export/${requestId}`,
      );
      return json.data;
    },
    enabled: !!requestId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && (data.status === 'PENDING' || data.status === 'PROCESSING')) {
        return 5000;
      }
      return false;
    },
  });
}

export function useDataDeletionRequest() {
  const queryClient = useQueryClient();
  return useMutation<DataDeletionRequestDto, Error>({
    mutationFn: async () => {
      const json = await apiClient<ApiResponse<DataDeletionRequestDto>>(
        '/api/v1/contributors/me/data-deletion',
        { method: 'POST' },
      );
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataDeletion'] });
    },
  });
}

export function useDataDeletionConfirm() {
  const queryClient = useQueryClient();
  return useMutation<DataDeletionRequestDto, Error, string>({
    mutationFn: async (requestId) => {
      const json = await apiClient<ApiResponse<DataDeletionRequestDto>>(
        `/api/v1/contributors/me/data-deletion/${requestId}/confirm`,
        { method: 'POST' },
      );
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataDeletion'] });
    },
  });
}

export function useDataDeletionCancel() {
  const queryClient = useQueryClient();
  return useMutation<DataDeletionRequestDto, Error, string>({
    mutationFn: async (requestId) => {
      const json = await apiClient<ApiResponse<DataDeletionRequestDto>>(
        `/api/v1/contributors/me/data-deletion/${requestId}/cancel`,
        { method: 'POST' },
      );
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dataDeletion'] });
    },
  });
}

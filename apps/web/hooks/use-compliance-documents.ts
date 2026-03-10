'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type {
  ComplianceDocumentDto,
  ComplianceDocumentDetailDto,
  ComplianceDocumentTypeValue,
} from '@edin/shared';

interface CompliancePagination {
  nextCursor: string | null;
  hasMore: boolean;
  limit: number;
}

interface ListResponse {
  data: ComplianceDocumentDto[];
  meta: { timestamp: string; correlationId: string; pagination: CompliancePagination };
}

interface DetailResponse {
  data: ComplianceDocumentDetailDto;
  meta: { timestamp: string; correlationId: string };
}

export function useComplianceDocuments(cursor?: string, limit?: number) {
  const { data, isLoading, error, isFetching } = useQuery<ListResponse>({
    queryKey: ['admin', 'complianceDocuments', cursor, limit],
    queryFn: () => {
      const params = new URLSearchParams();
      if (cursor) params.set('cursor', cursor);
      if (limit) params.set('limit', String(limit));
      const qs = params.toString();
      return apiClient<ListResponse>(`/api/v1/admin/compliance/ai-act${qs ? `?${qs}` : ''}`);
    },
    staleTime: 30_000,
  });

  return {
    documents: data?.data ?? [],
    pagination: data?.meta?.pagination ?? null,
    isLoading,
    isFetching,
    error,
  };
}

export function useComplianceDocument(docId: string | null) {
  return useQuery({
    queryKey: ['admin', 'complianceDocument', docId],
    queryFn: async (): Promise<ComplianceDocumentDetailDto> => {
      const json = await apiClient<DetailResponse>(`/api/v1/admin/compliance/ai-act/${docId}`);
      return json.data;
    },
    enabled: !!docId,
  });
}

export function useGenerateComplianceDocument() {
  const queryClient = useQueryClient();
  return useMutation<ComplianceDocumentDetailDto, Error, ComplianceDocumentTypeValue>({
    mutationFn: async (documentType) => {
      const json = await apiClient<DetailResponse>('/api/v1/admin/compliance/ai-act/generate', {
        method: 'POST',
        body: JSON.stringify({ documentType }),
      });
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'complianceDocuments'] });
    },
  });
}

export function useReviewComplianceDocument() {
  const queryClient = useQueryClient();
  return useMutation<ComplianceDocumentDetailDto, Error, { docId: string; reviewNotes: string }>({
    mutationFn: async ({ docId, reviewNotes }) => {
      const json = await apiClient<DetailResponse>(
        `/api/v1/admin/compliance/ai-act/${docId}/review`,
        {
          method: 'POST',
          body: JSON.stringify({ reviewNotes }),
        },
      );
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'complianceDocuments'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'complianceDocument'] });
    },
  });
}

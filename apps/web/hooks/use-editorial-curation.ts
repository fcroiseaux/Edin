'use client';

import { useState, useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { EditorialCurationResultDto } from '@edin/shared';

interface PendingChange {
  itemId: string;
  editorialRankOverride: number | null;
}

interface ApiResponse<T> {
  data: T;
}

export function useEditorialCuration(editionId: string | null) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Map<string, number | null>>(new Map());
  const queryClient = useQueryClient();

  const saveMutation = useMutation<ApiResponse<EditorialCurationResultDto>, Error, PendingChange[]>(
    {
      mutationFn: async (items) => {
        return apiClient<ApiResponse<EditorialCurationResultDto>>(
          `/api/v1/newspaper/editions/${editionId}/curation`,
          {
            method: 'PATCH',
            body: JSON.stringify({ items }),
          },
        );
      },
      onSuccess: () => {
        // Invalidate newspaper queries to refresh the display
        queryClient.invalidateQueries({ queryKey: ['newspaper'] });
        setPendingChanges(new Map());
        setIsEditMode(false);
      },
    },
  );

  const enterEditMode = useCallback(() => {
    setIsEditMode(true);
    setPendingChanges(new Map());
  }, []);

  const exitEditMode = useCallback(() => {
    setIsEditMode(false);
    setPendingChanges(new Map());
  }, []);

  const setItemRank = useCallback((itemId: string, rank: number | null) => {
    setPendingChanges((prev) => {
      const next = new Map(prev);
      next.set(itemId, rank);
      return next;
    });
  }, []);

  const promoteItem = useCallback(
    (itemId: string, currentEffectiveRank: number) => {
      if (currentEffectiveRank <= 1) return;
      setItemRank(itemId, currentEffectiveRank - 1);
    },
    [setItemRank],
  );

  const demoteItem = useCallback(
    (itemId: string, currentEffectiveRank: number, maxRank: number) => {
      if (currentEffectiveRank >= maxRank) return;
      setItemRank(itemId, currentEffectiveRank + 1);
    },
    [setItemRank],
  );

  const setAsHeadline = useCallback(
    (itemId: string) => {
      setItemRank(itemId, 1);
    },
    [setItemRank],
  );

  const resetItem = useCallback(
    (itemId: string) => {
      setItemRank(itemId, null);
    },
    [setItemRank],
  );

  const saveCuration = useCallback(() => {
    if (pendingChanges.size === 0) return;
    const items = Array.from(pendingChanges.entries()).map(([itemId, editorialRankOverride]) => ({
      itemId,
      editorialRankOverride,
    }));
    saveMutation.mutate(items);
  }, [pendingChanges, saveMutation]);

  const hasPendingChanges = useMemo(() => pendingChanges.size > 0, [pendingChanges]);

  return {
    isEditMode,
    enterEditMode,
    exitEditMode,
    pendingChanges,
    promoteItem,
    demoteItem,
    setAsHeadline,
    resetItem,
    saveCuration,
    hasPendingChanges,
    isSaving: saveMutation.isPending,
    saveError: saveMutation.error,
  };
}

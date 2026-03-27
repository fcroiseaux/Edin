'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

interface Nomination {
  id: string;
  nomineeId: string;
  nomineeName?: string;
  nomineeDomain?: string | null;
  prizeCategoryId: string;
  prizeCategoryName: string;
  channelId: string;
  channelName: string;
  rationale: string;
  status: 'OPEN' | 'AWARDED' | 'EXPIRED' | 'WITHDRAWN';
  voteCount?: number;
  createdAt: string;
  expiresAt: string;
}

interface NominationsResponse {
  data: Nomination[];
  meta: {
    timestamp: string;
    correlationId: string;
    pagination?: { hasMore: boolean; cursor?: string };
  };
}

interface CreateNominationPayload {
  nomineeId: string;
  prizeCategoryId: string;
  channelId: string;
  rationale: string;
}

interface CreateNominationResponse {
  data: {
    id: string;
    nomineeId: string;
    prizeCategoryId: string;
    prizeCategoryName: string;
    channelId: string;
    channelName: string;
    status: string;
    createdAt: string;
    expiresAt: string;
  };
  meta: { timestamp: string; correlationId: string };
}

interface WithdrawResponse {
  data: { id: string; status: string };
  meta: { timestamp: string; correlationId: string };
}

export function useActiveNominations(options?: { excludeOwn?: boolean }) {
  const excludeOwn = options?.excludeOwn ?? false;
  const url = excludeOwn
    ? '/api/v1/community-nominations/active?excludeOwn=true'
    : '/api/v1/community-nominations/active';

  const { data, isLoading, error } = useQuery<NominationsResponse>({
    queryKey: ['community-nominations', 'active', { excludeOwn }],
    queryFn: () => apiClient<NominationsResponse>(url),
  });

  return {
    nominations: data?.data ?? [],
    isLoading,
    error,
  };
}

export function useMyNominations() {
  const { data, isLoading, error } = useQuery<NominationsResponse>({
    queryKey: ['community-nominations', 'mine'],
    queryFn: () => apiClient<NominationsResponse>('/api/v1/community-nominations/mine'),
  });

  return {
    nominations: data?.data ?? [],
    isLoading,
    error,
  };
}

export function useReceivedNominations() {
  const { data, isLoading, error } = useQuery<NominationsResponse>({
    queryKey: ['community-nominations', 'received'],
    queryFn: () => apiClient<NominationsResponse>('/api/v1/community-nominations/received'),
  });

  return {
    nominations: data?.data ?? [],
    isLoading,
    error,
  };
}

export function useCreateNomination() {
  const queryClient = useQueryClient();

  return useMutation<CreateNominationResponse, Error, CreateNominationPayload>({
    mutationFn: (payload) =>
      apiClient<CreateNominationResponse>('/api/v1/community-nominations', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-nominations', 'active'] });
      queryClient.invalidateQueries({ queryKey: ['community-nominations', 'mine'] });
    },
  });
}

export function useWithdrawNomination() {
  const queryClient = useQueryClient();

  return useMutation<WithdrawResponse, Error, string>({
    mutationFn: (nominationId) =>
      apiClient<WithdrawResponse>(`/api/v1/community-nominations/${nominationId}/withdraw`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-nominations', 'mine'] });
      queryClient.invalidateQueries({ queryKey: ['community-nominations', 'active'] });
    },
  });
}

// ─── Nomination Voting Hooks ────────────────────────────────────────────────

interface CastVoteResponse {
  data: { voteId: string; nominationId: string; currentVoteCount: number };
  meta: { timestamp: string; correlationId: string };
}

interface HasVotedResponse {
  data: { hasVoted: boolean };
  meta: { timestamp: string; correlationId: string };
}

export function useCastVote() {
  const queryClient = useQueryClient();

  return useMutation<CastVoteResponse, Error, string>({
    mutationFn: (nominationId) =>
      apiClient<CastVoteResponse>(`/api/v1/community-nominations/${nominationId}/votes`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['community-nominations', 'active'] });
    },
  });
}

export function useHasVoted(nominationId: string) {
  const { data, isLoading } = useQuery<HasVotedResponse>({
    queryKey: ['nomination-votes', 'mine', nominationId],
    queryFn: () =>
      apiClient<HasVotedResponse>(`/api/v1/community-nominations/${nominationId}/votes/mine`),
    enabled: !!nominationId,
  });

  return {
    hasVoted: data?.data?.hasVoted ?? false,
    isLoading,
  };
}

interface BatchVotedResponse {
  data: { votedNominationIds: string[] };
  meta: { timestamp: string; correlationId: string };
}

export function useVotedNominationIds(nominationIds: string[]) {
  const idsParam = nominationIds.join(',');
  const { data, isLoading } = useQuery<BatchVotedResponse>({
    queryKey: ['nomination-votes', 'batch', idsParam],
    queryFn: () =>
      apiClient<BatchVotedResponse>(
        `/api/v1/community-nominations/votes/batch?ids=${encodeURIComponent(idsParam)}`,
      ),
    enabled: nominationIds.length > 0,
  });

  const votedSet = new Set(data?.data?.votedNominationIds ?? []);
  return { votedSet, isLoading };
}

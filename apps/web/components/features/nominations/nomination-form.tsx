'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { useCreateNomination } from '../../../hooks/use-community-nominations';
import { useProfile } from '../../../hooks/use-profile';

interface Contributor {
  id: string;
  name: string;
  domain: string | null;
}

interface Channel {
  id: string;
  name: string;
  type: string;
}

interface PrizeCategory {
  id: string;
  name: string;
  description: string;
  detectionType: string;
}

interface ContributorListResponse {
  data: Contributor[];
  meta: { timestamp: string; correlationId: string };
}

interface ChannelListResponse {
  data: Channel[];
  meta: { timestamp: string; correlationId: string };
}

interface PrizeCategoryListResponse {
  data: PrizeCategory[];
  meta: { timestamp: string; correlationId: string };
}

export function NominationForm({ onSuccess }: { onSuccess?: () => void }) {
  const { profile } = useProfile();
  const createNomination = useCreateNomination();

  const [nomineeId, setNomineeId] = useState('');
  const [channelId, setChannelId] = useState('');
  const [prizeCategoryId, setPrizeCategoryId] = useState('');
  const [rationale, setRationale] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Fetch contributors (excluding current user)
  const { data: contributorsData, isLoading: loadingContributors } =
    useQuery<ContributorListResponse>({
      queryKey: ['contributors', 'for-nomination'],
      queryFn: () =>
        apiClient<ContributorListResponse>('/api/v1/contributors?role=CONTRIBUTOR&limit=200'),
    });

  // Fetch channels
  const { data: channelsData, isLoading: loadingChannels } = useQuery<ChannelListResponse>({
    queryKey: ['channels', 'active'],
    queryFn: () => apiClient<ChannelListResponse>('/api/v1/channels'),
  });

  // Fetch prize categories (only COMMUNITY_NOMINATED)
  const { data: categoriesData, isLoading: loadingCategories } =
    useQuery<PrizeCategoryListResponse>({
      queryKey: ['prize-categories', 'community-nominated'],
      queryFn: () =>
        apiClient<PrizeCategoryListResponse>(
          '/api/v1/prize-categories?detectionType=COMMUNITY_NOMINATED',
        ),
    });

  const contributors = (contributorsData?.data ?? []).filter((c) => c.id !== profile?.id);
  const channels = channelsData?.data ?? [];
  const categories = categoriesData?.data ?? [];

  const isLoading = loadingContributors || loadingChannels || loadingCategories;
  const canSubmit = nomineeId && channelId && prizeCategoryId && rationale.length >= 50;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      await createNomination.mutateAsync({
        nomineeId,
        prizeCategoryId,
        channelId,
        rationale,
      });

      // Reset form
      setNomineeId('');
      setChannelId('');
      setPrizeCategoryId('');
      setRationale('');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create nomination');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-[var(--spacing-md)]">
        <div className="h-10 animate-pulse rounded-[var(--radius-md)] bg-surface-sunken" />
        <div className="h-10 animate-pulse rounded-[var(--radius-md)] bg-surface-sunken" />
        <div className="h-10 animate-pulse rounded-[var(--radius-md)] bg-surface-sunken" />
        <div className="h-24 animate-pulse rounded-[var(--radius-md)] bg-surface-sunken" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-[var(--spacing-md)]">
      {error && (
        <div className="rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-[var(--spacing-sm)] text-sm text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="nominee" className="mb-1 block text-sm font-medium text-text-primary">
          Nominate a Peer
        </label>
        <select
          id="nominee"
          value={nomineeId}
          onChange={(e) => setNomineeId(e.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised px-[var(--spacing-sm)] py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        >
          <option value="">Select a contributor...</option>
          {contributors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.domain ? ` (${c.domain})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="channel" className="mb-1 block text-sm font-medium text-text-primary">
          Channel
        </label>
        <select
          id="channel"
          value={channelId}
          onChange={(e) => setChannelId(e.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised px-[var(--spacing-sm)] py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        >
          <option value="">Select a channel...</option>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="prizeCategory" className="mb-1 block text-sm font-medium text-text-primary">
          Recognition Category
        </label>
        <select
          id="prizeCategory"
          value={prizeCategoryId}
          onChange={(e) => setPrizeCategoryId(e.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised px-[var(--spacing-sm)] py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        >
          <option value="">Select a category...</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="rationale" className="mb-1 block text-sm font-medium text-text-primary">
          Rationale
        </label>
        <textarea
          id="rationale"
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          placeholder="Describe why this contributor deserves recognition (minimum 50 characters)..."
          rows={4}
          className="w-full rounded-[var(--radius-md)] border border-surface-subtle bg-surface-raised px-[var(--spacing-sm)] py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        />
        <p
          className={`mt-1 text-xs ${rationale.length >= 50 ? 'text-text-tertiary' : 'text-text-secondary'}`}
        >
          {rationale.length}/50 characters minimum
        </p>
      </div>

      <button
        type="submit"
        disabled={!canSubmit || createNomination.isPending}
        className="w-full rounded-[var(--radius-md)] bg-accent-primary px-[var(--spacing-md)] py-2 text-sm font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {createNomination.isPending ? 'Submitting...' : 'Submit Nomination'}
      </button>
    </form>
  );
}

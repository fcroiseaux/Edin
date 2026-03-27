'use client';

import { useState } from 'react';
import { NominationForm } from '../../../../components/features/nominations/nomination-form';
import { NominationCard } from '../../../../components/features/nominations/nomination-card';
import {
  useActiveNominations,
  useMyNominations,
  useReceivedNominations,
  useWithdrawNomination,
  useVotedNominationIds,
} from '../../../../hooks/use-community-nominations';
import { useProfile } from '../../../../hooks/use-profile';

type Tab = 'vote' | 'active' | 'mine' | 'received';

const STATUS_BADGES: Record<string, { className: string; label: string }> = {
  OPEN: {
    className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    label: 'Open',
  },
  AWARDED: {
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    label: 'Awarded',
  },
  EXPIRED: {
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    label: 'Expired',
  },
  WITHDRAWN: {
    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    label: 'Withdrawn',
  },
};

function StatusBadge({ status }: { status: string }) {
  const badge = STATUS_BADGES[status] ?? STATUS_BADGES.OPEN;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function NominationsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('vote');
  const [showForm, setShowForm] = useState(false);
  const { profile } = useProfile();

  const { nominations: votableNominations, isLoading: loadingVotable } = useActiveNominations({
    excludeOwn: true,
  });
  const { nominations: activeNominations, isLoading: loadingActive } = useActiveNominations();
  const { nominations: myNominations, isLoading: loadingMine } = useMyNominations();
  const { nominations: receivedNominations, isLoading: loadingReceived } = useReceivedNominations();
  const withdrawNomination = useWithdrawNomination();

  // Batch query which nominations the current user has voted on
  const votableIds = votableNominations.map((n) => n.id);
  const { votedSet } = useVotedNominationIds(votableIds);

  // Sort votable nominations by vote count descending, then by date
  const sortedVotable = [...votableNominations].sort((a, b) => {
    const voteDiff = (b.voteCount ?? 0) - (a.voteCount ?? 0);
    if (voteDiff !== 0) return voteDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'vote', label: 'Vote', count: votableNominations.length },
    { key: 'active', label: 'All Active', count: activeNominations.length },
    { key: 'mine', label: 'My Nominations', count: myNominations.length },
    { key: 'received', label: 'Received', count: receivedNominations.length },
  ];

  const isLoading =
    activeTab === 'vote'
      ? loadingVotable
      : activeTab === 'active'
        ? loadingActive
        : activeTab === 'mine'
          ? loadingMine
          : loadingReceived;
  const nominations =
    activeTab === 'active'
      ? activeNominations
      : activeTab === 'mine'
        ? myNominations
        : receivedNominations;

  return (
    <div className="space-y-[var(--spacing-lg)]">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Nominations</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-[var(--radius-md)] bg-accent-primary px-[var(--spacing-md)] py-2 text-sm font-medium text-white transition-colors hover:bg-accent-primary/90"
        >
          {showForm ? 'Cancel' : 'Nominate a Peer'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
          <h2 className="mb-[var(--spacing-md)] text-lg font-medium text-text-primary">
            New Nomination
          </h2>
          <NominationForm onSuccess={() => setShowForm(false)} />
        </div>
      )}

      <div className="flex gap-1 rounded-[var(--radius-md)] bg-surface-sunken p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-[var(--radius-sm)] px-[var(--spacing-sm)] py-1.5 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-surface-raised text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}{' '}
            {tab.count > 0 && <span className="ml-1 text-xs opacity-70">({tab.count})</span>}
          </button>
        ))}
      </div>

      {activeTab === 'vote' ? (
        loadingVotable ? (
          <div className="space-y-[var(--spacing-md)]">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-[var(--radius-lg)] bg-surface-sunken"
              />
            ))}
          </div>
        ) : sortedVotable.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-xl)] text-center">
            <p className="text-sm text-text-secondary">
              No nominations available for voting at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-[var(--spacing-sm)]">
            {sortedVotable.map((nomination) => (
              <NominationCard
                key={nomination.id}
                nomination={nomination}
                currentUserId={profile?.id ?? ''}
                hasVoted={votedSet.has(nomination.id)}
              />
            ))}
          </div>
        )
      ) : isLoading ? (
        <div className="space-y-[var(--spacing-md)]">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-[var(--radius-lg)] bg-surface-sunken"
            />
          ))}
        </div>
      ) : nominations.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-xl)] text-center">
          <p className="text-sm text-text-secondary">
            {activeTab === 'active' && 'No active nominations at this time.'}
            {activeTab === 'mine' && "You haven't submitted any nominations yet."}
            {activeTab === 'received' && "You haven't received any nominations yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-[var(--spacing-sm)]">
          {nominations.map((nomination) => (
            <div
              key={nomination.id}
              className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-md)] shadow-[var(--shadow-card)]"
            >
              <div className="flex items-start justify-between gap-[var(--spacing-md)]">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {'nomineeName' in nomination && nomination.nomineeName && (
                      <span className="text-sm font-medium text-text-primary">
                        {nomination.nomineeName}
                      </span>
                    )}
                    <StatusBadge status={nomination.status} />
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-text-secondary">
                    <span>{nomination.prizeCategoryName}</span>
                    <span>&middot;</span>
                    <span>{nomination.channelName}</span>
                    <span>&middot;</span>
                    <span>{formatRelativeDate(nomination.createdAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-text-secondary line-clamp-2">
                    {nomination.rationale}
                  </p>
                </div>

                {activeTab === 'mine' && nomination.status === 'OPEN' && (
                  <button
                    onClick={() => withdrawNomination.mutate(nomination.id)}
                    disabled={withdrawNomination.isPending}
                    className="shrink-0 rounded-[var(--radius-md)] border border-surface-subtle px-[var(--spacing-sm)] py-1 text-xs text-text-secondary transition-colors hover:border-red-300 hover:text-red-600"
                  >
                    Withdraw
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

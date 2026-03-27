'use client';

import { useState, useCallback } from 'react';
import { useCastVote } from '../../../hooks/use-community-nominations';

interface NominationCardProps {
  nomination: {
    id: string;
    nomineeId: string;
    nomineeName?: string;
    nomineeDomain?: string | null;
    prizeCategoryName: string;
    channelName: string;
    rationale: string;
    voteCount?: number;
    createdAt: string;
    expiresAt: string;
  };
  currentUserId: string;
  hasVoted: boolean;
}

export function NominationCard({
  nomination,
  currentUserId,
  hasVoted: initialHasVoted,
}: NominationCardProps) {
  const castVote = useCastVote();
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [optimisticVoteCount, setOptimisticVoteCount] = useState(nomination.voteCount ?? 0);
  const [voteError, setVoteError] = useState<string | null>(null);
  const isNominee = nomination.nomineeId === currentUserId;

  const handleVote = useCallback(async () => {
    if (hasVoted || isNominee) return;
    setVoteError(null);

    // Optimistic update
    setHasVoted(true);
    setOptimisticVoteCount((prev) => prev + 1);

    try {
      await castVote.mutateAsync(nomination.id);
    } catch (err) {
      // Rollback on error
      setHasVoted(false);
      setOptimisticVoteCount((prev) => prev - 1);
      setVoteError(err instanceof Error ? err.message : 'Failed to cast vote');
    }
  }, [hasVoted, isNominee, castVote, nomination.id]);

  // Chatham House label: use domain or fallback
  const chathamLabel = nomination.nomineeDomain
    ? `A ${nomination.nomineeDomain.toLowerCase()} contributor`
    : 'A community contributor';

  const [daysRemaining] = useState(() =>
    Math.max(
      0,
      Math.ceil((new Date(nomination.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    ),
  );

  return (
    <div className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-md)]">
      <div className="flex items-start justify-between gap-[var(--spacing-sm)]">
        <div className="flex-1 space-y-[var(--spacing-xs)]">
          {/* Chatham House label */}
          <div className="flex items-center gap-[var(--spacing-xs)]">
            <span className="inline-flex items-center rounded-full bg-accent-primary/10 px-2.5 py-0.5 text-xs font-medium text-accent-primary">
              {chathamLabel}
            </span>
            <span className="inline-flex items-center rounded-full bg-surface-sunken px-2 py-0.5 text-xs text-text-secondary">
              {nomination.channelName}
            </span>
          </div>

          {/* Prize category */}
          <p className="text-sm font-medium text-text-primary">{nomination.prizeCategoryName}</p>

          {/* Rationale */}
          <p className="text-sm text-text-secondary leading-relaxed">{nomination.rationale}</p>

          {/* Error display */}
          {voteError && <p className="text-xs text-red-500 dark:text-red-400">{voteError}</p>}

          {/* Metadata row */}
          <div className="flex items-center gap-[var(--spacing-md)] text-xs text-text-tertiary">
            <span>{daysRemaining}d remaining</span>
            <span>{new Date(nomination.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Vote action column */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-lg font-semibold text-text-primary">{optimisticVoteCount}</span>
          <span className="text-[10px] uppercase tracking-wider text-text-tertiary">votes</span>

          {isNominee ? (
            <span className="mt-1 inline-flex items-center rounded-full bg-accent-primary/10 px-2 py-1 text-xs font-medium text-accent-primary">
              Your nomination
            </span>
          ) : hasVoted ? (
            <span className="mt-1 inline-flex items-center rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-600 dark:text-green-400">
              Voted
            </span>
          ) : (
            <button
              onClick={handleVote}
              disabled={castVote.isPending}
              className="mt-1 rounded-[var(--radius-md)] border border-accent-primary bg-transparent px-3 py-1 text-xs font-medium text-accent-primary transition-colors hover:bg-accent-primary hover:text-white disabled:opacity-50"
            >
              {castVote.isPending ? '...' : 'Vote'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

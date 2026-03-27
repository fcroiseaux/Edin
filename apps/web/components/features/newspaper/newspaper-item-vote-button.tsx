'use client';

import { useState, useCallback } from 'react';
import { useCastItemVote } from '../../../hooks/use-newspaper-item-voting';

interface NewspaperItemVoteButtonProps {
  itemId: string;
  voteCount: number;
  hasVoted: boolean;
  isAuthenticated: boolean;
  disabled?: boolean;
}

export function NewspaperItemVoteButton({
  itemId,
  voteCount,
  hasVoted: initialHasVoted,
  isAuthenticated,
  disabled = false,
}: NewspaperItemVoteButtonProps) {
  const castVote = useCastItemVote();
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [optimisticCount, setOptimisticCount] = useState(voteCount);

  const handleVote = useCallback(async () => {
    if (hasVoted || !isAuthenticated || disabled) return;

    // Optimistic update
    setHasVoted(true);
    setOptimisticCount((prev) => prev + 1);

    try {
      await castVote.mutateAsync(itemId);
    } catch {
      // Rollback on error
      setHasVoted(false);
      setOptimisticCount((prev) => prev - 1);
    }
  }, [hasVoted, isAuthenticated, disabled, castVote, itemId]);

  // Unauthenticated: read-only count display
  if (!isAuthenticated) {
    return (
      <span
        className="inline-flex items-center gap-1 text-body-sm text-text-tertiary"
        aria-label={`${optimisticCount} votes`}
      >
        <VoteIcon className="w-4 h-4" />
        <span>{optimisticCount}</span>
      </span>
    );
  }

  // Already voted: non-interactive indicator
  if (hasVoted) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-body-sm font-medium text-accent-primary bg-accent-primary/10 min-h-[44px] min-w-[44px] justify-center"
        aria-label="You voted for this item"
        aria-pressed="true"
        role="button"
      >
        <CheckIcon className="w-4 h-4" />
        <span>Voted</span>
        <span className="text-text-tertiary">{optimisticCount}</span>
      </span>
    );
  }

  // Can vote: interactive button
  return (
    <button
      onClick={handleVote}
      disabled={disabled || castVote.isPending}
      className="inline-flex items-center gap-1.5 rounded-full border border-surface-subtle px-3 py-1 text-body-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-accent-primary hover:border-accent-primary/30 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] justify-center"
      aria-label="Vote for this item"
    >
      <VoteIcon className="w-4 h-4" />
      <span>Vote</span>
      <span className="text-text-tertiary">{optimisticCount}</span>
    </button>
  );
}

function VoteIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

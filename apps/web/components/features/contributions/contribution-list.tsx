'use client';

import type { ContributionWithRepository } from '@edin/shared';
import { ContributionListItem } from './contribution-list-item';

interface ContributionListProps {
  contributions: ContributionWithRepository[];
  isLoading: boolean;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
  onSelectContribution: (id: string) => void;
}

function ContributionListSkeleton() {
  return (
    <div className="space-y-[var(--spacing-sm)]" aria-label="Loading contributions">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-[var(--spacing-md)] rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-md)]"
        >
          <div className="skeleton h-[44px] w-[44px] rounded-[var(--radius-md)]" />
          <div className="flex-1 space-y-[var(--spacing-xs)]">
            <div className="skeleton h-[18px] w-[200px]" />
            <div className="skeleton h-[14px] w-[140px]" />
          </div>
          <div className="skeleton h-[22px] w-[100px] rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function ContributionList({
  contributions,
  isLoading,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  onSelectContribution,
}: ContributionListProps) {
  if (isLoading) {
    return <ContributionListSkeleton />;
  }

  if (contributions.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-2xl)] text-center">
        <p className="font-sans text-[15px] text-brand-secondary">No contributions yet</p>
        <p className="mt-[var(--spacing-xs)] font-serif text-[14px] text-brand-secondary/60">
          Contributions will appear here as they are ingested from connected repositories.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-[var(--spacing-sm)]" role="list" aria-label="Your contributions">
        {contributions.map((contribution) => (
          <div key={contribution.id} role="listitem">
            <ContributionListItem contribution={contribution} onSelect={onSelectContribution} />
          </div>
        ))}
      </div>

      {hasNextPage && (
        <div className="mt-[var(--spacing-lg)] flex justify-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
            className="min-h-[44px] rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-lg)] font-sans text-[15px] font-medium text-brand-secondary transition-colors duration-[var(--transition-fast)] hover:bg-surface-sunken disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}

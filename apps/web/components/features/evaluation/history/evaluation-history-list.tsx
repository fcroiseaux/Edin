'use client';

import Link from 'next/link';
import { scoreToLabel } from '@edin/shared';
import type { EvaluationHistoryItemDto } from '@edin/shared';

interface EvaluationHistoryListProps {
  items: EvaluationHistoryItemDto[];
  hasMore: boolean;
  isFetchingMore: boolean;
  onLoadMore: () => void;
}

export function EvaluationHistoryList({
  items,
  hasMore,
  isFetchingMore,
  onLoadMore,
}: EvaluationHistoryListProps) {
  if (items.length === 0) {
    return (
      <p className="py-[var(--spacing-xl)] text-center font-sans text-[14px] text-brand-secondary">
        No evaluations found for the selected filters.
      </p>
    );
  }

  const typeLabel = (type: string) => {
    if (type === 'PULL_REQUEST') return 'PR';
    if (type === 'DOCUMENTATION') return 'Doc';
    return 'Commit';
  };

  return (
    <div>
      <div className="flex flex-col gap-[var(--spacing-sm)]">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/dashboard/evaluations/${item.id}`}
            className="group rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-md)] transition-colors hover:border-brand-accent/30 hover:bg-surface-sunken/50"
          >
            <div className="flex items-start justify-between gap-[var(--spacing-md)]">
              <div className="min-w-0 flex-1">
                <div className="mb-[var(--spacing-xs)] flex items-center gap-[var(--spacing-sm)]">
                  <span className="inline-block rounded-full bg-surface-sunken px-[var(--spacing-sm)] py-[2px] font-sans text-[11px] font-medium text-brand-secondary">
                    {typeLabel(item.contributionType)}
                  </span>
                  <time className="font-sans text-[12px] text-brand-secondary">
                    {new Date(item.completedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </time>
                </div>
                <p className="font-sans text-[14px] font-medium text-brand-primary">
                  {item.contributionTitle}
                </p>
                {item.narrativePreview && (
                  <p className="mt-[var(--spacing-xs)] line-clamp-2 font-serif text-[13px] leading-[1.5] text-brand-secondary">
                    {item.narrativePreview}
                  </p>
                )}
              </div>
              <span className="shrink-0 font-sans text-[13px] font-medium text-brand-accent">
                {scoreToLabel(item.compositeScore)}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {hasMore && (
        <div className="mt-[var(--spacing-md)] text-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={isFetchingMore}
            className="font-sans text-[14px] text-brand-accent hover:underline disabled:opacity-50"
          >
            {isFetchingMore ? 'Loading...' : 'Load more evaluations'}
          </button>
        </div>
      )}
    </div>
  );
}

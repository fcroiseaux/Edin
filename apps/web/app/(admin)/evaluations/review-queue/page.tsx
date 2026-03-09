'use client';

import { useState } from 'react';
import { useReviewQueue } from '../../../../hooks/use-evaluation-review';
import { ReviewQueueTable } from '../../../../components/features/evaluation/review/review-queue-table';

const DOMAIN_OPTIONS = ['', 'TECHNOLOGY', 'FINTECH', 'IMPACT', 'GOVERNANCE'];

export default function ReviewQueuePage() {
  const [domain, setDomain] = useState('');
  const { items, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useReviewQueue({
    domain: domain || undefined,
  });

  return (
    <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <h1 className="font-serif text-[24px] font-bold text-brand-primary">
        Evaluation Review Queue
      </h1>
      <p className="mt-[var(--spacing-xs)] text-[14px] text-brand-secondary">
        Review flagged evaluations and confirm or override AI assessments.
      </p>

      <div className="mt-[var(--spacing-lg)] flex items-center gap-[var(--spacing-md)]">
        <label htmlFor="domain-filter" className="font-sans text-[13px] text-brand-secondary">
          Filter by domain:
        </label>
        <select
          id="domain-filter"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-xs)] font-sans text-[14px] text-brand-primary focus:border-brand-accent focus:outline-none"
        >
          <option value="">All domains</option>
          {DOMAIN_OPTIONS.filter(Boolean).map((d) => (
            <option key={d} value={d}>
              {d.charAt(0) + d.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-[var(--spacing-md)]">
        <ReviewQueueTable items={items} isLoading={isLoading} />
      </div>

      {hasNextPage && (
        <div className="mt-[var(--spacing-md)] flex justify-center">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-secondary transition-colors hover:text-brand-primary disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}

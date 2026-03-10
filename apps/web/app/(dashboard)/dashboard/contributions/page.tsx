'use client';

import { useState } from 'react';
import { useContributions } from '../../../../hooks/use-contributions';
import { useContributionSse } from '../../../../hooks/use-contribution-sse';
import { ContributionList } from '../../../../components/features/contributions/contribution-list';
import { ContributionDetail } from '../../../../components/features/contributions/contribution-detail';

export default function ContributionsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { contributions, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useContributions();
  const { isReconnecting } = useContributionSse();

  return (
    <main className="min-h-screen bg-surface-base px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <div className="mx-auto max-w-[56rem]">
        <h1 className="font-serif text-[32px] leading-[1.25] font-bold text-brand-primary">
          My Contributions
        </h1>

        {isReconnecting && (
          <div
            className="mt-[var(--spacing-sm)] inline-flex items-center gap-[var(--spacing-xs)] rounded-full border border-surface-border bg-surface-sunken px-[var(--spacing-sm)] py-[2px] font-sans text-[13px] text-brand-secondary"
            role="status"
            aria-live="polite"
          >
            Reconnecting...
          </div>
        )}

        <div className="mt-[var(--spacing-lg)]" aria-live="polite">
          <ContributionList
            contributions={contributions}
            isLoading={isLoading}
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={() => fetchNextPage()}
            onSelectContribution={setSelectedId}
          />
        </div>

        {selectedId && (
          <div className="mt-[var(--spacing-lg)]">
            <ContributionDetail contributionId={selectedId} onClose={() => setSelectedId(null)} />
          </div>
        )}
      </div>
    </main>
  );
}

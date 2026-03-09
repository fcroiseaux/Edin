'use client';

import { useState, useMemo } from 'react';
import { useEvaluationHistory } from '../../../hooks/use-evaluations';
import { EvaluationTimeline } from '../../../components/features/evaluation/history/evaluation-timeline';
import { EvaluationHistoryFilters } from '../../../components/features/evaluation/history/evaluation-history-filters';
import { EvaluationHistoryList } from '../../../components/features/evaluation/history/evaluation-history-list';

export default function EvaluationsPage() {
  const [contributionType, setContributionType] = useState('');
  const [timePeriod, setTimePeriod] = useState('');

  const dateFilters = useMemo(() => {
    if (!timePeriod) return {};
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - parseInt(timePeriod, 10));
    return {
      from: from.toISOString(),
      to: now.toISOString(),
    };
  }, [timePeriod]);

  const { items, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useEvaluationHistory(
    {
      contributionType: contributionType || undefined,
      ...dateFilters,
    },
  );

  return (
    <div className="mx-auto max-w-[1000px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <h1 className="font-serif text-[24px] font-bold text-brand-primary">Evaluations</h1>
      <p className="mt-[var(--spacing-xs)] font-sans text-[14px] text-brand-secondary">
        Your evaluation journey over time
      </p>

      <div className="mt-[var(--spacing-lg)]">
        <EvaluationHistoryFilters
          contributionType={contributionType}
          timePeriod={timePeriod}
          onContributionTypeChange={setContributionType}
          onTimePeriodChange={setTimePeriod}
        />
      </div>

      <div className="mt-[var(--spacing-lg)]">
        {isLoading ? (
          <div className="animate-pulse">
            <div className="h-[250px] rounded-[var(--radius-lg)] bg-surface-sunken" />
            <div className="mt-[var(--spacing-lg)] flex flex-col gap-[var(--spacing-sm)]">
              <div className="h-[80px] rounded-[var(--radius-md)] bg-surface-sunken" />
              <div className="h-[80px] rounded-[var(--radius-md)] bg-surface-sunken" />
              <div className="h-[80px] rounded-[var(--radius-md)] bg-surface-sunken" />
            </div>
          </div>
        ) : (
          <>
            <EvaluationTimeline items={items} />

            <div className="mt-[var(--spacing-xl)]">
              <h2 className="mb-[var(--spacing-sm)] font-sans text-[14px] font-medium text-brand-secondary">
                All Evaluations
              </h2>
              <EvaluationHistoryList
                items={items}
                hasMore={hasNextPage ?? false}
                isFetchingMore={isFetchingNextPage}
                onLoadMore={() => fetchNextPage()}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useContributorTrends,
  useCombinedContributorMetrics,
} from '../../../../../hooks/use-sprint-metrics';
import { EstimationAccuracyChart } from '../../../../../components/features/sprint-dashboard/estimation-accuracy-chart';
import { CombinedMetricsTable } from '../../../../../components/features/sprint-dashboard/combined-metrics-table';
import { DomainFilter } from '../../../../../components/features/sprint-dashboard/domain-filter';
import { ExportButton } from '../../../../../components/features/sprint-dashboard/export-button';

export default function ContributorsPage() {
  const [domain, setDomain] = useState<string | undefined>();
  const { trends, isLoading: trendsLoading } = useContributorTrends({ domain });
  const { metrics, isLoading: metricsLoading } = useCombinedContributorMetrics({ domain });

  return (
    <div className="p-[var(--spacing-xl)]">
      <div className="mb-[var(--spacing-lg)] flex items-center justify-between">
        <Link
          href="/admin/sprints"
          className="text-[13px] text-brand-accent underline underline-offset-2 hover:opacity-80"
        >
          Back to Sprint Dashboard
        </Link>
        <div className="flex items-center gap-[var(--spacing-md)]">
          <DomainFilter value={domain} onChange={setDomain} />
          <ExportButton domain={domain} />
        </div>
      </div>

      <h1 className="mb-[var(--spacing-xl)] font-serif text-[24px] font-bold text-brand-primary">
        Contributor Analytics
      </h1>

      <div className="space-y-[var(--spacing-lg)]">
        <section className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
          {trendsLoading ? (
            <div className="flex h-[350px] items-center justify-center">
              <p className="text-[14px] text-text-tertiary">Loading contributor data...</p>
            </div>
          ) : (
            <EstimationAccuracyChart data={trends} />
          )}
        </section>

        <section className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
          <h2 className="mb-[var(--spacing-md)] font-serif text-[18px] font-semibold text-brand-primary">
            Combined Sprint &amp; Evaluation Metrics
          </h2>
          {metricsLoading ? (
            <p className="text-[14px] text-text-tertiary">Loading combined metrics...</p>
          ) : (
            <CombinedMetricsTable data={metrics} />
          )}
        </section>
      </div>
    </div>
  );
}

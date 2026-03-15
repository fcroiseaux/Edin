'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import {
  useSprintBurndown,
  useSprintDetail,
  useScopeChanges,
} from '../../../../../hooks/use-sprint-metrics';
import { BurndownChart } from '../../../../../components/features/sprint-dashboard/burndown-chart';
import { ScopeChangesTable } from '../../../../../components/features/sprint-dashboard/scope-changes-table';
import { DomainFilter } from '../../../../../components/features/sprint-dashboard/domain-filter';
import { ExportButton } from '../../../../../components/features/sprint-dashboard/export-button';

export default function SprintDetailPage({ params }: { params: Promise<{ sprintId: string }> }) {
  const { sprintId } = use(params);
  const [domain, setDomain] = useState<string | undefined>();
  const { sprint, isLoading: detailLoading } = useSprintDetail(sprintId);
  const { burndownData, isLoading: burndownLoading } = useSprintBurndown(sprintId, { domain });
  const { scopeChanges, isLoading: scopeLoading } = useScopeChanges(sprintId, { domain });

  const sprintName = sprint?.sprintName ?? 'Sprint';
  const velocity = sprint?.velocity ?? 0;
  const committedPoints = sprint?.committedPoints ?? 0;
  const deliveredPoints = sprint?.deliveredPoints ?? 0;
  const cycleTimeAvg = sprint?.cycleTimeAvg ?? null;
  const leadTimeAvg = sprint?.leadTimeAvg ?? null;
  const scopeChangesCount = sprint?.scopeChanges ?? 0;
  const estimationAccuracy = sprint?.estimationAccuracy ?? null;
  const sprintStart = sprint?.sprintStart;
  const sprintEnd = sprint?.sprintEnd;

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
        {detailLoading ? 'Loading...' : sprintName}
      </h1>

      {!detailLoading && sprint && (
        <div className="mb-[var(--spacing-lg)] grid grid-cols-2 gap-[var(--spacing-md)] sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7">
          <MetricCard label="Velocity" value={velocity} unit="pts" />
          <MetricCard label="Committed" value={committedPoints} unit="pts" />
          <MetricCard label="Delivered" value={deliveredPoints} unit="pts" />
          <MetricCard
            label="Cycle Time"
            value={cycleTimeAvg != null ? `${cycleTimeAvg}` : '\u2014'}
            unit={cycleTimeAvg != null ? 'days' : ''}
          />
          <MetricCard
            label="Lead Time"
            value={leadTimeAvg != null ? `${leadTimeAvg}` : '\u2014'}
            unit={leadTimeAvg != null ? 'days' : ''}
          />
          <MetricCard label="Scope Changes" value={scopeChangesCount} unit="" />
          <MetricCard
            label="Est. Accuracy"
            value={estimationAccuracy != null ? `${estimationAccuracy}` : '\u2014'}
            unit={estimationAccuracy != null ? '%' : ''}
          />
        </div>
      )}

      {!detailLoading && sprintStart && sprintEnd && (
        <p className="mb-[var(--spacing-lg)] text-[13px] text-brand-secondary">
          {new Date(sprintStart).toISOString().split('T')[0]} —{' '}
          {new Date(sprintEnd).toISOString().split('T')[0]}
        </p>
      )}

      <div className="space-y-[var(--spacing-lg)]">
        <section className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
          {burndownLoading ? (
            <div className="flex h-[300px] items-center justify-center">
              <p className="text-[14px] text-text-tertiary">Loading burndown data...</p>
            </div>
          ) : (
            <BurndownChart data={burndownData} sprintName={sprintName} />
          )}
        </section>

        <section className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
          <h2 className="mb-[var(--spacing-md)] font-serif text-[18px] font-semibold text-brand-primary">
            Scope Changes
          </h2>
          {scopeLoading ? (
            <p className="text-[14px] text-text-tertiary">Loading scope changes...</p>
          ) : (
            <ScopeChangesTable data={scopeChanges} />
          )}
        </section>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-md)]">
      <p className="text-[12px] font-medium text-brand-secondary">{label}</p>
      <p className="mt-[var(--spacing-xs)] font-serif text-[24px] font-bold text-brand-primary">
        {value}
        {unit && (
          <span className="ml-[var(--spacing-xs)] text-[12px] font-normal text-text-tertiary">
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}

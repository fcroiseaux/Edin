'use client';

import type { EvaluationModelMetricsDto } from '@edin/shared';

interface ModelMetricsComparisonProps {
  metrics: EvaluationModelMetricsDto | null;
  isLoading: boolean;
}

export function ModelMetricsComparison({ metrics, isLoading }: ModelMetricsComparisonProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
        <div className="h-4 w-48 rounded bg-surface-border" />
        <div className="mt-[var(--spacing-md)] grid grid-cols-3 gap-[var(--spacing-md)]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-[var(--radius-md)] bg-surface-border" />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] text-center text-brand-secondary">
        Select a model to view performance metrics.
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
      <h3 className="font-serif text-[16px] font-semibold text-brand-primary">
        {metrics.modelName} — {metrics.modelVersion}
      </h3>
      <div className="mt-[var(--spacing-md)] grid grid-cols-3 gap-[var(--spacing-md)]">
        <MetricCard label="Evaluations" value={metrics.evaluationCount.toString()} />
        <MetricCard
          label="Average Score"
          value={metrics.averageScore !== null ? metrics.averageScore.toFixed(1) : '—'}
        />
        <MetricCard
          label="Score Variance"
          value={metrics.scoreVariance !== null ? metrics.scoreVariance.toFixed(1) : '—'}
        />
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-surface-border bg-surface-base p-[var(--spacing-md)]">
      <p className="text-[12px] font-medium text-brand-secondary">{label}</p>
      <p className="mt-[var(--spacing-xs)] font-serif text-[24px] font-bold text-brand-primary">
        {value}
      </p>
    </div>
  );
}

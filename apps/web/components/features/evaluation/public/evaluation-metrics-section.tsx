'use client';

import type { PublicEvaluationAggregateDto } from '@edin/shared';
import { usePublicEvaluationMetrics } from '../../../../hooks/use-public-evaluation-metrics';
import { StatCard, StatCardSkeleton } from '../../metrics/stat-card';
import { ScoreDistributionChart } from './score-distribution-chart';
import { DOMAIN_HEX_COLORS } from '../../../../lib/domain-colors';

interface EvaluationMetricsSectionProps {
  initialData?: PublicEvaluationAggregateDto;
}

export function EvaluationMetricsSection({ initialData }: EvaluationMetricsSectionProps) {
  const { metrics, isLoading } = usePublicEvaluationMetrics(initialData);

  if (isLoading && !metrics) {
    return <EvaluationMetricsSkeleton />;
  }

  if (!metrics || metrics.totalEvaluations === 0) {
    return null;
  }

  return (
    <section
      className="mx-auto max-w-[64rem] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]"
      aria-label="Evaluation intelligence"
    >
      <h2 className="font-serif text-[clamp(1.5rem,3vw,2rem)] leading-[1.2] font-bold text-brand-primary">
        Evaluation Intelligence
      </h2>
      <p className="mt-[var(--spacing-sm)] max-w-[42rem] font-sans text-[15px] leading-[1.65] text-brand-secondary">
        Every contribution is evaluated by AI for quality, rigor, and impact. Here is how the
        community performs across domains.
      </p>

      {/* Key Metrics Grid */}
      <div className="mt-[var(--spacing-xl)] grid grid-cols-1 gap-[var(--spacing-md)] sm:grid-cols-3">
        <StatCard
          label="Total Evaluations"
          value={metrics.totalEvaluations.toLocaleString()}
          context="contributions evaluated by AI"
        />
        <StatCard
          label="Average Quality Score"
          value={metrics.averageScore.toFixed(1)}
          context="across all evaluated contributions"
        />
        <StatCard
          label="AI-Human Alignment"
          value={
            metrics.agreementRate.totalReviewed > 0 ? `${metrics.agreementRate.overall}%` : 'N/A'
          }
          context={
            metrics.agreementRate.totalReviewed > 0
              ? `based on ${metrics.agreementRate.totalReviewed} human reviews`
              : 'human reviews have not yet begun'
          }
        />
      </div>

      {/* Domain Scores */}
      {metrics.byDomain.length > 0 && (
        <div className="mt-[var(--spacing-xl)]">
          <h3 className="font-sans text-[14px] font-medium uppercase tracking-wider text-brand-secondary">
            Scores by Domain
          </h3>
          <div className="mt-[var(--spacing-sm)] grid grid-cols-1 gap-[var(--spacing-sm)] sm:grid-cols-2">
            {metrics.byDomain.map((d) => (
              <div
                key={d.domain}
                className="flex items-center gap-[var(--spacing-md)] rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-md)]"
              >
                <div
                  className="h-[40px] w-[4px] shrink-0 rounded-full"
                  style={{
                    backgroundColor: DOMAIN_HEX_COLORS[d.domain] ?? 'var(--color-brand-secondary)',
                  }}
                />
                <div className="flex-1">
                  <p className="font-sans text-[14px] font-medium text-brand-primary">{d.domain}</p>
                  <p className="font-sans text-[12px] text-brand-secondary">
                    {d.count} evaluations
                  </p>
                </div>
                <span className="font-serif text-[24px] font-bold text-brand-primary">
                  {d.averageScore.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score Distribution */}
      <div className="mt-[var(--spacing-xl)]">
        <h3 className="font-sans text-[14px] font-medium uppercase tracking-wider text-brand-secondary">
          Score Distribution
        </h3>
        <div className="mt-[var(--spacing-sm)] rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
          <ScoreDistributionChart distribution={metrics.scoreDistribution} />
        </div>
      </div>
    </section>
  );
}

function EvaluationMetricsSkeleton() {
  return (
    <section
      className="mx-auto max-w-[64rem] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]"
      role="status"
      aria-label="Loading evaluation metrics"
    >
      <div className="skeleton h-[32px] w-[250px]" />
      <div className="skeleton mt-[var(--spacing-sm)] h-[20px] w-[400px]" />
      <div className="mt-[var(--spacing-xl)] grid grid-cols-1 gap-[var(--spacing-md)] sm:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    </section>
  );
}

'use client';

import { useHealthMetrics } from '../../../hooks/use-health-metrics';
import { useAlerts, useDismissAlert } from '../../../hooks/use-alerts';
import { MetricCard } from '../../../components/features/admin/health-metrics/metric-card';
import { DomainDistributionChart } from '../../../components/features/admin/health-metrics/domain-distribution-chart';
import { RetentionChart } from '../../../components/features/admin/health-metrics/retention-chart';
import { AlertBanner } from '../../../components/features/admin/health-metrics/alert-banner';
import { KpiGrid } from '../../../components/features/admin/health-metrics/kpi-grid';

function DashboardSkeleton() {
  return (
    <div className="space-y-[var(--spacing-lg)]">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-md)]"
        >
          <div className="flex items-center justify-between">
            <div className="skeleton h-[16px] w-[140px]" />
            <div className="skeleton h-[28px] w-[80px]" />
          </div>
          <div className="mt-[var(--spacing-sm)] skeleton h-[14px] w-full" />
        </div>
      ))}
      <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-md)]">
        <div className="skeleton h-[16px] w-[120px]" />
        <div className="mt-[var(--spacing-md)] skeleton h-[200px] w-full" />
      </div>
      <div>
        <div className="skeleton h-[20px] w-[180px]" />
        <div className="mt-[var(--spacing-md)] grid gap-[var(--spacing-md)] sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-md)]"
            >
              <div className="skeleton h-[14px] w-[100px]" />
              <div className="mt-[var(--spacing-sm)] skeleton h-[24px] w-[60px]" />
              <div className="mt-[var(--spacing-sm)] skeleton h-[12px] w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { metrics, isLoading } = useHealthMetrics();
  const { alerts } = useAlerts();
  const dismissMutation = useDismissAlert();

  return (
    <main className="min-h-screen bg-surface-base">
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
        <h1 className="font-serif text-[28px] font-bold text-brand-primary">
          Community Health Dashboard
        </h1>
        <p className="mt-[var(--spacing-xs)] font-serif text-[14px] text-brand-secondary">
          Real-time community vitals, KPIs, and system health.
        </p>

        <div className="mt-[var(--spacing-lg)]">
          <AlertBanner
            alerts={alerts}
            onDismiss={(id) => dismissMutation.mutate(id)}
            isDismissing={dismissMutation.isPending}
          />
        </div>

        {isLoading || !metrics ? (
          <div className="mt-[var(--spacing-2xl)]">
            <DashboardSkeleton />
          </div>
        ) : (
          <div className="mt-[var(--spacing-2xl)] space-y-[var(--spacing-2xl)]">
            {/* Community Vitals */}
            <section aria-label="Community vitals">
              <h2 className="font-serif text-[18px] font-bold text-brand-primary">
                Community Vitals
              </h2>
              <div className="mt-[var(--spacing-md)] grid gap-[var(--spacing-md)] sm:grid-cols-2">
                <MetricCard metric={metrics.vitals.activeContributors} />
                <MetricCard metric={metrics.vitals.contributionFrequency} />
                <MetricCard metric={metrics.vitals.feedbackTurnaroundHours} />
                <MetricCard metric={metrics.vitals.evaluationCompletionRate} />
                <MetricCard metric={metrics.vitals.publicationRate} />
                <MetricCard metric={metrics.vitals.avgEvaluationScore} />
              </div>
            </section>

            {/* Domain Distribution */}
            <section aria-label="Domain distribution">
              <DomainDistributionChart distribution={metrics.vitals.domainDistribution} />
            </section>

            {/* Retention */}
            <section aria-label="Retention">
              <RetentionChart retention={metrics.vitals.retentionRate} />
            </section>

            {/* Leading KPIs */}
            <section aria-label="Leading KPIs">
              <KpiGrid title="Leading Indicators" kpis={metrics.leadingKpis} />
            </section>

            {/* Lagging KPIs */}
            <section aria-label="Lagging KPIs">
              <KpiGrid title="Lagging Indicators" kpis={metrics.laggingKpis} />
            </section>

            <p className="font-sans text-[12px] text-brand-secondary opacity-60">
              Last updated: {new Date(metrics.generatedAt).toLocaleString()}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

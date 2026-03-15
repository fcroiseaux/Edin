'use client';

import { useAuth } from '../../../../hooks/use-auth';
import { usePersonalSprintMetrics } from '../../../../hooks/use-sprint-metrics';
import { PersonalVelocityChart } from '../../../../components/features/sprint-dashboard/personal-velocity-chart';
import { PersonalAccuracyChart } from '../../../../components/features/sprint-dashboard/personal-accuracy-chart';
import { PersonalReliabilityChart } from '../../../../components/features/sprint-dashboard/personal-reliability-chart';

export default function DashboardSprintMetricsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { metrics, isLoading, error } = usePersonalSprintMetrics(user?.id ?? null);

  if (authLoading || isLoading) {
    return (
      <div className="p-[var(--spacing-xl)]">
        <h1 className="mb-[var(--spacing-xl)] font-serif text-[24px] font-bold text-brand-primary">
          Sprint Metrics
        </h1>
        <p className="font-sans text-[14px] text-neutral-400">Loading sprint metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-[var(--spacing-xl)]">
        <h1 className="mb-[var(--spacing-xl)] font-serif text-[24px] font-bold text-brand-primary">
          Sprint Metrics
        </h1>
        <p className="font-sans text-[14px] text-red-500">
          Failed to load sprint metrics. Please try again later.
        </p>
      </div>
    );
  }

  if (!metrics || metrics.summary.totalSprints === 0) {
    return (
      <div className="p-[var(--spacing-xl)]">
        <h1 className="mb-[var(--spacing-xl)] font-serif text-[24px] font-bold text-brand-primary">
          Sprint Metrics
        </h1>
        <div className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
          <p className="font-sans text-[14px] text-text-tertiary">
            No sprint metrics available yet. Your personal velocity, estimation accuracy, and
            planning reliability will appear here after your contributions are tracked in a sprint.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-[var(--spacing-xl)]">
      <h1 className="mb-[var(--spacing-xl)] font-serif text-[24px] font-bold text-brand-primary">
        Sprint Metrics
      </h1>

      {/* Summary Cards */}
      <section className="mb-[var(--spacing-lg)]" aria-label="Sprint metrics summary">
        <div className="grid grid-cols-2 gap-[var(--spacing-md)] sm:grid-cols-4">
          <div className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-md)]">
            <p className="font-sans text-[12px] text-text-tertiary">Total Sprints</p>
            <p className="mt-[var(--spacing-xs)] font-serif text-[24px] font-bold text-brand-primary">
              {metrics.summary.totalSprints}
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-md)]">
            <p className="font-sans text-[12px] text-text-tertiary">Total Delivered</p>
            <p className="mt-[var(--spacing-xs)] font-serif text-[24px] font-bold text-brand-primary">
              {metrics.summary.totalDeliveredPoints}
              <span className="ml-1 font-sans text-[12px] font-normal text-text-tertiary">pts</span>
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-md)]">
            <p className="font-sans text-[12px] text-text-tertiary">Avg. Velocity</p>
            <p className="mt-[var(--spacing-xs)] font-serif text-[24px] font-bold text-brand-primary">
              {metrics.summary.averageVelocity != null ? metrics.summary.averageVelocity : '\u2014'}
              <span className="ml-1 font-sans text-[12px] font-normal text-text-tertiary">
                pts/sprint
              </span>
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-md)]">
            <p className="font-sans text-[12px] text-text-tertiary">Avg. Accuracy</p>
            <p className="mt-[var(--spacing-xs)] font-serif text-[24px] font-bold text-brand-primary">
              {metrics.summary.averageAccuracy != null
                ? `${metrics.summary.averageAccuracy}%`
                : '\u2014'}
            </p>
          </div>
        </div>
      </section>

      {/* Personal Velocity Chart */}
      <section className="mb-[var(--spacing-lg)]">
        <PersonalVelocityChart data={metrics.velocity} />
      </section>

      {/* Estimation Accuracy Chart */}
      <section className="mb-[var(--spacing-lg)]">
        <PersonalAccuracyChart data={metrics.estimationAccuracy} />
      </section>

      {/* Planning Reliability Chart */}
      <section>
        <PersonalReliabilityChart
          data={metrics.planningReliability.trend}
          averageDeliveryRatio={metrics.planningReliability.averageDeliveryRatio}
          averageEstimationVariance={metrics.planningReliability.averageEstimationVariance}
        />
      </section>
    </div>
  );
}

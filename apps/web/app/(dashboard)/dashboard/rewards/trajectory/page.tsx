'use client';

import { useState } from 'react';
import { useTrajectory } from '../../../../../hooks/use-trajectory';
import { TrajectoryChart } from '../../../../../components/features/reward-trajectory/trajectory-chart';
import { ScalingLawExplainer } from '../../../../../components/features/reward-trajectory/scaling-law-explainer';
import type { TrajectoryTimeRange } from '@edin/shared';

export default function RewardTrajectoryPage() {
  const [timeRange, setTimeRange] = useState<TrajectoryTimeRange>('year');
  const { trajectory, isLoading, error } = useTrajectory(timeRange);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[720px] p-[var(--spacing-xl)]">
        <h1 className="mb-[var(--spacing-sm)] font-serif text-[24px] font-bold text-brand-primary">
          Your Growth Trajectory
        </h1>
        <p className="mb-[var(--spacing-xl)] font-sans text-[14px] text-brand-secondary">
          See how sustained engagement compounds your impact over time.
        </p>
        <p className="font-sans text-[14px] text-neutral-400">Loading trajectory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[720px] p-[var(--spacing-xl)]">
        <h1 className="mb-[var(--spacing-sm)] font-serif text-[24px] font-bold text-brand-primary">
          Your Growth Trajectory
        </h1>
        <p className="font-sans text-[14px] text-red-500">
          Failed to load trajectory. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[720px] p-[var(--spacing-xl)]">
      <h1 className="mb-[var(--spacing-sm)] font-serif text-[24px] font-bold text-brand-primary">
        Your Growth Trajectory
      </h1>
      <p className="mb-[var(--spacing-xl)] font-sans text-[14px] text-brand-secondary">
        See how sustained engagement compounds your impact over time.
      </p>

      {/* Trajectory Chart */}
      <section className="mb-[var(--spacing-lg)]" aria-label="Reward trajectory chart">
        <TrajectoryChart
          points={trajectory?.points ?? []}
          projected={trajectory?.projected ?? []}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
        />
      </section>

      {/* Scaling Law Explainer */}
      <ScalingLawExplainer summary={trajectory?.summary ?? null} />
    </div>
  );
}

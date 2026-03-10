'use client';

import { useState } from 'react';
import { REWARD_METHODOLOGY } from '@edin/shared';
import type { TrajectorySummaryDto } from '@edin/shared';

interface ScalingLawExplainerProps {
  summary: TrajectorySummaryDto | null;
}

const TREND_MESSAGES: Record<string, string> = {
  RISING: 'Your garden is flourishing — sustained engagement is compounding your growth.',
  STABLE: 'Your garden is steady — consistent contributions sustain a healthy growth trajectory.',
  DECLINING: 'Your garden is resting — returning to regular contributions will re-activate growth.',
};

export function ScalingLawExplainer({ summary }: ScalingLawExplainerProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section
      className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-base p-[var(--spacing-lg)]"
      aria-label="How your growth compounds"
    >
      {/* Summary insight */}
      {summary && (
        <div className="mb-[var(--spacing-md)]">
          <p className="font-serif text-[15px] leading-[1.5] text-brand-primary">
            {TREND_MESSAGES[summary.overallTrend] ?? TREND_MESSAGES.STABLE}
          </p>
          <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-brand-secondary">
            {Math.round(summary.tenureMonths)} month
            {Math.round(summary.tenureMonths) !== 1 ? 's' : ''} of engagement &middot;{' '}
            {summary.currentMultiplier}x current multiplier &middot; {summary.totalContributions}{' '}
            contribution{summary.totalContributions !== 1 ? 's' : ''} in this view
          </p>
        </div>
      )}

      {/* Expandable explanation */}
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="font-sans text-[13px] font-medium text-brand-accent underline underline-offset-2 hover:opacity-80"
        aria-expanded={expanded}
      >
        {expanded ? 'Hide' : 'How'} scaling-law compounding works
      </button>

      {expanded && (
        <div className="mt-[var(--spacing-md)] space-y-[var(--spacing-md)]">
          <p className="font-sans text-[14px] leading-[1.6] text-brand-primary">
            Like a garden that grows richer with sustained care, your contributions compound over
            time. Early and consistent engagement creates an accelerating trajectory of recognition.
          </p>

          {/* Scaling curve reference */}
          <div>
            <h4 className="mb-[var(--spacing-xs)] font-sans text-[13px] font-medium text-brand-secondary">
              Growth multiplier over time
            </h4>
            <div className="flex flex-wrap gap-[var(--spacing-sm)]">
              {REWARD_METHODOLOGY.scalingCurve.map((point) => (
                <div
                  key={point.month}
                  className="rounded-[var(--radius-sm)] bg-surface-raised px-[var(--spacing-sm)] py-[4px] text-center"
                >
                  <p className="font-sans text-[12px] text-brand-secondary">{point.label}</p>
                  <p className="font-sans text-[14px] font-medium text-brand-primary">
                    {point.multiplier}x
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Formula components */}
          <div>
            <h4 className="mb-[var(--spacing-xs)] font-sans text-[13px] font-medium text-brand-secondary">
              What shapes your score
            </h4>
            <ul className="space-y-[var(--spacing-xs)]">
              {REWARD_METHODOLOGY.formulaComponents.map((component) => (
                <li key={component.name} className="font-sans text-[13px] text-brand-primary">
                  <span className="font-medium">{component.name}</span>
                  <span className="text-brand-secondary">
                    {' '}
                    &mdash; {component.qualitativeWeight}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

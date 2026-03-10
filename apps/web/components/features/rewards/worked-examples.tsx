'use client';

import { useId } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { REWARD_METHODOLOGY } from '@edin/shared';
import type { WorkedExample } from '@edin/shared';

const MAX_MONTHLY = 50;

function computeExamplePoints(example: WorkedExample) {
  const curve = REWARD_METHODOLOGY.scalingCurve;
  const points: Array<{ month: number; score: number }> = [];

  for (let month = 1; month <= example.months; month++) {
    const rawScore =
      (example.avgQualityScore * Math.min(example.monthlyContributions, MAX_MONTHLY)) / MAX_MONTHLY;

    // Interpolate multiplier
    let multiplier = 1.0;
    if (month >= curve[curve.length - 1].month) {
      multiplier = curve[curve.length - 1].multiplier;
    } else {
      for (let i = 0; i < curve.length - 1; i++) {
        if (month >= curve[i].month && month <= curve[i + 1].month) {
          const ratio = (month - curve[i].month) / (curve[i + 1].month - curve[i].month);
          multiplier =
            curve[i].multiplier + ratio * (curve[i + 1].multiplier - curve[i].multiplier);
          break;
        }
      }
    }

    points.push({
      month,
      score: Math.round(rawScore * multiplier * 100) / 100,
    });
  }

  return points;
}

function computeTotal(points: Array<{ month: number; score: number }>): number {
  return Math.round(points.reduce((sum, p) => sum + p.score, 0) * 100) / 100;
}

export function WorkedExamples() {
  const examples = REWARD_METHODOLOGY.workedExamples;

  return (
    <section
      className="mx-auto max-w-[720px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]"
      aria-label="Worked examples of contribution patterns"
    >
      <h2 className="font-serif text-[clamp(1.25rem,3vw,1.5rem)] leading-[1.3] font-semibold text-brand-primary">
        Patterns in the Garden
      </h2>
      <p className="mt-[var(--spacing-sm)] font-sans text-[14px] leading-[1.5] text-brand-secondary">
        See how different contribution approaches produce different reward trajectories.
      </p>

      <div className="mt-[var(--spacing-lg)] space-y-[var(--spacing-md)]">
        {examples.map((example) => (
          <ExampleCard key={example.name} example={example} />
        ))}
      </div>
    </section>
  );
}

function ExampleCard({ example }: { example: WorkedExample }) {
  const gradientId = useId();
  const points = computeExamplePoints(example);
  const total = computeTotal(points);
  const finalMultiplier =
    points.length > 0
      ? Math.round(
          (points[points.length - 1].score /
            ((example.avgQualityScore * Math.min(example.monthlyContributions, MAX_MONTHLY)) /
              MAX_MONTHLY || 1)) *
            100,
        ) / 100
      : 1;

  return (
    <div className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
      <div className="flex items-start justify-between gap-[var(--spacing-md)]">
        <div className="min-w-0 flex-1">
          <h3 className="font-sans text-[15px] font-semibold text-brand-primary">{example.name}</h3>
          <p className="mt-[var(--spacing-xs)] font-serif text-[14px] leading-[1.5] text-brand-secondary">
            {example.description}
          </p>
          <div className="mt-[var(--spacing-sm)] flex flex-wrap gap-[var(--spacing-sm)] font-sans text-[12px] text-brand-secondary">
            <span>{example.monthlyContributions} contributions/mo</span>
            <span aria-hidden="true">&middot;</span>
            <span>{example.avgQualityScore} avg quality</span>
            <span aria-hidden="true">&middot;</span>
            <span>
              {example.months} month{example.months !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="mt-[var(--spacing-xs)] font-sans text-[13px]">
            <span className="text-brand-secondary">Result: </span>
            <span className="font-medium text-brand-accent">
              {total.toLocaleString()} reward units
            </span>
            <span className="text-brand-secondary"> at </span>
            <span className="font-medium text-brand-accent">{finalMultiplier}x</span>
            <span className="text-brand-secondary"> multiplier</span>
          </div>
        </div>

        {/* Mini chart */}
        <div
          className="w-[140px] shrink-0"
          role="img"
          aria-label={`Growth curve for ${example.name}: ${total} total reward units over ${example.months} months`}
        >
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={points} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C4956A" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#C4956A" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" hide />
              <YAxis hide />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#C4956A"
                strokeWidth={1.5}
                fill={`url(#${gradientId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

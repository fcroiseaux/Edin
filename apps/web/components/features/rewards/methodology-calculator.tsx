'use client';

import { useState, useCallback, useEffect, useId } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useMethodologyCalculator } from '../../../hooks/use-methodology-calculator';
import type { CalculatorProjectedPoint } from '@edin/shared';

const DOMAINS = [
  { value: 'technology', label: 'Technology' },
  { value: 'fintech', label: 'Fintech' },
  { value: 'impact', label: 'Impact' },
  { value: 'governance', label: 'Governance' },
] as const;

export function MethodologyCalculator() {
  const gradientId = useId();
  const [monthlyContributions, setMonthlyContributions] = useState(5);
  const [avgQualityScore, setAvgQualityScore] = useState(70);
  const [months, setMonths] = useState(12);
  const [domain, setDomain] = useState('technology');

  const { mutate, data, isPending } = useMethodologyCalculator();

  const calculate = useCallback(() => {
    mutate({ monthlyContributions, avgQualityScore, months, domain });
  }, [mutate, monthlyContributions, avgQualityScore, months, domain]);

  // Debounced calculation on input change
  useEffect(() => {
    const timer = setTimeout(calculate, 500);
    return () => clearTimeout(timer);
  }, [calculate]);

  // Initial calculation
  useEffect(() => {
    calculate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      className="mx-auto max-w-[720px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]"
      aria-label="Interactive reward calculator"
    >
      <h2 className="font-serif text-[clamp(1.25rem,3vw,1.5rem)] leading-[1.3] font-semibold text-brand-primary">
        Explore Your Potential
      </h2>
      <p className="mt-[var(--spacing-sm)] font-sans text-[14px] leading-[1.5] text-brand-secondary">
        Adjust the inputs below to see how different contribution patterns affect your reward
        trajectory.
      </p>

      <div className="mt-[var(--spacing-lg)] space-y-[var(--spacing-md)]">
        {/* Monthly Contributions */}
        <div>
          <label
            htmlFor="calc-contributions"
            className="flex items-center justify-between font-sans text-[14px] font-medium text-brand-primary"
          >
            Monthly contributions
            <span className="text-brand-accent">{monthlyContributions}</span>
          </label>
          <input
            id="calc-contributions"
            type="range"
            min={1}
            max={50}
            value={monthlyContributions}
            onChange={(e) => setMonthlyContributions(Number(e.target.value))}
            className="mt-[var(--spacing-xs)] w-full accent-brand-accent"
            aria-valuemin={1}
            aria-valuemax={50}
            aria-valuenow={monthlyContributions}
          />
        </div>

        {/* Average Quality Score */}
        <div>
          <label
            htmlFor="calc-quality"
            className="flex items-center justify-between font-sans text-[14px] font-medium text-brand-primary"
          >
            Average quality score
            <span className="text-brand-accent">{avgQualityScore}</span>
          </label>
          <input
            id="calc-quality"
            type="range"
            min={0}
            max={100}
            value={avgQualityScore}
            onChange={(e) => setAvgQualityScore(Number(e.target.value))}
            className="mt-[var(--spacing-xs)] w-full accent-brand-accent"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={avgQualityScore}
          />
        </div>

        {/* Engagement Duration */}
        <div>
          <label
            htmlFor="calc-months"
            className="flex items-center justify-between font-sans text-[14px] font-medium text-brand-primary"
          >
            Engagement duration
            <span className="text-brand-accent">
              {months} month{months !== 1 ? 's' : ''}
            </span>
          </label>
          <input
            id="calc-months"
            type="range"
            min={1}
            max={36}
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
            className="mt-[var(--spacing-xs)] w-full accent-brand-accent"
            aria-valuemin={1}
            aria-valuemax={36}
            aria-valuenow={months}
          />
        </div>

        {/* Domain */}
        <fieldset>
          <legend className="font-sans text-[14px] font-medium text-brand-primary">Domain</legend>
          <div className="mt-[var(--spacing-xs)] flex flex-wrap gap-[var(--spacing-sm)]">
            {DOMAINS.map((d) => (
              <label
                key={d.value}
                className={`cursor-pointer rounded-full border px-[var(--spacing-sm)] py-[2px] font-sans text-[13px] transition-colors ${
                  domain === d.value
                    ? 'border-brand-accent bg-brand-accent/10 text-brand-accent'
                    : 'border-surface-border text-brand-secondary hover:border-brand-accent/50'
                }`}
              >
                <input
                  type="radio"
                  name="calc-domain"
                  value={d.value}
                  checked={domain === d.value}
                  onChange={() => setDomain(d.value)}
                  className="sr-only"
                />
                {d.label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {/* Results */}
      <div className="mt-[var(--spacing-lg)]">
        {isPending && !data && (
          <div className="flex h-[220px] items-center justify-center" role="status">
            <div className="skeleton h-full w-full rounded-[var(--radius-lg)]" />
          </div>
        )}

        {data && (
          <>
            {/* Summary stats */}
            <div className="mb-[var(--spacing-md)] grid grid-cols-2 gap-[var(--spacing-sm)] sm:grid-cols-4">
              <SummaryStat
                label="Total contributions"
                value={data.summary.totalContributions.toString()}
              />
              <SummaryStat label="Final multiplier" value={`${data.summary.finalMultiplier}x`} />
              <SummaryStat
                label="Reward units"
                value={data.summary.totalRewardUnits.toLocaleString()}
              />
              <SummaryStat label="Compounding" value={data.summary.compoundingEffect} />
            </div>

            {/* Chart */}
            <div
              role="img"
              aria-label={`Projected reward trajectory: ${data.summary.totalRewardUnits} total reward units over ${months} months with ${data.summary.compoundingEffect}`}
            >
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={data.projectedPoints}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C4956A" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#C4956A" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" />
                  <XAxis
                    dataKey="month"
                    tick={{
                      fontSize: 12,
                      fontFamily: 'var(--font-sans)',
                      fill: 'var(--color-brand-secondary)',
                    }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v: number) => `${v}mo`}
                  />
                  <YAxis
                    tick={{
                      fontSize: 12,
                      fontFamily: 'var(--font-sans)',
                      fill: 'var(--color-brand-secondary)',
                    }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(value) => [`${value ?? 0}`, 'Score']}
                    contentStyle={{
                      backgroundColor: 'var(--color-surface-raised)',
                      border: '1px solid var(--color-surface-border)',
                      borderRadius: '8px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '13px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="compoundedScore"
                    stroke="#C4956A"
                    strokeWidth={2}
                    fill={`url(#${gradientId})`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Accessible table */}
            <CalculatorTable points={data.projectedPoints} />
          </>
        )}
      </div>
    </section>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-sm)] text-center">
      <div className="font-sans text-[12px] text-brand-secondary">{label}</div>
      <div className="font-sans text-[15px] font-semibold text-brand-primary">{value}</div>
    </div>
  );
}

function CalculatorTable({ points }: { points: CalculatorProjectedPoint[] }) {
  return (
    <div className="sr-only">
      <table aria-label="Calculator projected trajectory data">
        <thead>
          <tr>
            <th>Month</th>
            <th>Raw Score</th>
            <th>Multiplier</th>
            <th>Compounded Score</th>
            <th>Cumulative</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.month}>
              <td>{p.month}</td>
              <td>{p.rawScore}</td>
              <td>{p.compoundingMultiplier}x</td>
              <td>{p.compoundedScore}</td>
              <td>{p.cumulativeRewardUnits}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

'use client';

import { useState, useId } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { TrajectoryPointDto, TrajectoryTimeRange } from '@edin/shared';

interface TrajectoryChartProps {
  points: TrajectoryPointDto[];
  projected: TrajectoryPointDto[];
  timeRange: TrajectoryTimeRange;
  onTimeRangeChange: (range: TrajectoryTimeRange) => void;
  accentColor?: string;
}

const TIME_RANGES: { value: TrajectoryTimeRange; label: string }[] = [
  { value: '30d', label: 'Last 30 days' },
  { value: 'quarter', label: 'Last quarter' },
  { value: 'year', label: 'Last year' },
  { value: 'all', label: 'All time' },
];

const TREND_LABELS: Record<string, string> = {
  RISING: 'rising',
  STABLE: 'steady',
  DECLINING: 'resting',
};

function formatDate(dateStr: string, timeRange: TrajectoryTimeRange): string {
  const d = new Date(dateStr);
  switch (timeRange) {
    case '30d':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'quarter':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'year':
    case 'all':
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  }
}

export function TrajectoryChart({
  points,
  projected,
  timeRange,
  onTimeRangeChange,
  accentColor = '#C4956A',
}: TrajectoryChartProps) {
  const [showTable, setShowTable] = useState(false);
  const gradientId = useId();
  const projectedGradientId = useId();

  // Merge actual + projected data for the chart
  const chartData = [
    ...points.map((p) => ({
      ...p,
      label: formatDate(p.date, timeRange),
      actual: p.compoundedScore,
      projected: null as number | null,
    })),
    // Bridge: last actual point repeated as first projected
    ...(projected.length > 0 && points.length > 0
      ? [
          {
            ...points[points.length - 1],
            label: formatDate(points[points.length - 1].date, timeRange),
            actual: null as number | null,
            projected: points[points.length - 1].compoundedScore,
          },
        ]
      : []),
    ...projected.map((p) => ({
      ...p,
      label: formatDate(p.date, timeRange),
      actual: null as number | null,
      projected: p.compoundedScore,
    })),
  ];

  const allPoints = [...points, ...projected];

  if (points.length === 0) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-[var(--radius-lg)] border border-surface-border bg-surface-base">
        <p className="font-sans text-[14px] text-brand-secondary">
          Your trajectory will appear as contributions accumulate.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Time range toggles */}
      <div className="mb-[var(--spacing-md)] flex items-center justify-between">
        <div className="flex gap-[var(--spacing-xs)]">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => onTimeRangeChange(range.value)}
              className={`rounded-[var(--radius-sm)] px-[var(--spacing-sm)] py-[4px] font-sans text-[13px] transition-colors ${
                timeRange === range.value
                  ? 'bg-brand-accent/15 font-medium text-brand-primary'
                  : 'text-brand-secondary hover:text-brand-primary'
              }`}
              aria-pressed={timeRange === range.value}
            >
              {range.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowTable((prev) => !prev)}
          className="font-sans text-[13px] text-brand-accent underline underline-offset-2 hover:opacity-80"
          aria-label={showTable ? 'Show chart view' : 'Show data table view'}
        >
          {showTable ? 'Show chart' : 'View as table'}
        </button>
      </div>

      {showTable ? (
        <table
          className="w-full text-left font-sans text-[14px]"
          aria-label="Reward trajectory data"
        >
          <thead>
            <tr className="border-b border-surface-border">
              <th className="pb-[var(--spacing-sm)] font-medium text-brand-secondary">Period</th>
              <th className="pb-[var(--spacing-sm)] font-medium text-brand-secondary">Score</th>
              <th className="pb-[var(--spacing-sm)] font-medium text-brand-secondary">
                Multiplier
              </th>
              <th className="pb-[var(--spacing-sm)] font-medium text-brand-secondary">
                Compounded
              </th>
              <th className="pb-[var(--spacing-sm)] font-medium text-brand-secondary">
                Contributions
              </th>
              <th className="pb-[var(--spacing-sm)] font-medium text-brand-secondary">Trend</th>
            </tr>
          </thead>
          <tbody>
            {allPoints.map((point, i) => (
              <tr
                key={i}
                className={`border-b border-surface-border/50 ${point.isProjected ? 'opacity-60' : ''}`}
              >
                <td className="py-[var(--spacing-sm)] text-brand-primary">
                  {formatDate(point.date, timeRange)}
                  {point.isProjected && (
                    <span className="ml-1 text-[12px] text-brand-secondary">(projected)</span>
                  )}
                </td>
                <td className="py-[var(--spacing-sm)] text-brand-primary">{point.rawScore}</td>
                <td className="py-[var(--spacing-sm)] text-brand-primary">
                  {point.compoundingMultiplier}x
                </td>
                <td className="py-[var(--spacing-sm)] text-brand-primary">
                  {point.compoundedScore}
                </td>
                <td className="py-[var(--spacing-sm)] text-brand-primary">
                  {point.contributionCount}
                </td>
                <td className="py-[var(--spacing-sm)] text-brand-primary">
                  {TREND_LABELS[point.trend] ?? point.trend}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <>
          <div className="h-[280px] w-full" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={accentColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={accentColor} stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id={projectedGradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={accentColor} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={accentColor} stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: 'var(--color-brand-secondary)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--color-brand-secondary)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const data = payload[0].payload as TrajectoryPointDto & {
                      label: string;
                    };
                    return (
                      <div className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-sm)] shadow-lg">
                        <p className="font-sans text-[12px] font-medium text-brand-primary">
                          {data.label}
                          {data.isProjected && ' (projected)'}
                        </p>
                        <p className="font-sans text-[12px] text-brand-secondary">
                          Score: {data.rawScore} &times; {data.compoundingMultiplier}x ={' '}
                          {data.compoundedScore}
                        </p>
                        <p className="font-sans text-[12px] text-brand-secondary">
                          {data.contributionCount} contribution
                          {data.contributionCount !== 1 ? 's' : ''} &middot;{' '}
                          {TREND_LABELS[data.trend] ?? data.trend}
                        </p>
                      </div>
                    );
                  }}
                />
                {/* Actual trajectory */}
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke={accentColor}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  dot={{ r: 3, fill: accentColor, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: accentColor, strokeWidth: 2, stroke: '#fff' }}
                  connectNulls={false}
                />
                {/* Projected trajectory */}
                <Area
                  type="monotone"
                  dataKey="projected"
                  stroke={accentColor}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fill={`url(#${projectedGradientId})`}
                  dot={{ r: 2, fill: accentColor, strokeWidth: 0, opacity: 0.5 }}
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Screen-reader accessible data table */}
          <table className="sr-only" aria-label="Reward trajectory data">
            <thead>
              <tr>
                <th>Period</th>
                <th>Score</th>
                <th>Multiplier</th>
                <th>Compounded Score</th>
                <th>Contributions</th>
                <th>Trend</th>
                <th>Projected</th>
              </tr>
            </thead>
            <tbody>
              {allPoints.map((point, i) => (
                <tr key={i}>
                  <td>{formatDate(point.date, timeRange)}</td>
                  <td>{point.rawScore}</td>
                  <td>{point.compoundingMultiplier}x</td>
                  <td>{point.compoundedScore}</td>
                  <td>{point.contributionCount}</td>
                  <td>{TREND_LABELS[point.trend] ?? point.trend}</td>
                  <td>{point.isProjected ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

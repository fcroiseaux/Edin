'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { ScoreDistributionBucketDto } from '@edin/shared';

const BAR_COLOR = '#3A7D7E'; // brand-accent teal

interface ScoreDistributionChartProps {
  distribution: ScoreDistributionBucketDto[];
}

export function ScoreDistributionChart({ distribution }: ScoreDistributionChartProps) {
  const total = distribution.reduce((sum, b) => sum + b.count, 0);

  if (total === 0) {
    return (
      <p className="font-sans text-[13px] text-brand-secondary">
        Score distribution data will appear as evaluations accumulate.
      </p>
    );
  }

  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={distribution} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <XAxis
            dataKey="range"
            tick={{ fontSize: 12, fill: 'var(--color-brand-secondary)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: 'var(--color-brand-secondary)' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-surface-border)',
              borderRadius: '8px',
              fontSize: '13px',
            }}
            formatter={(value: number) => [`${value} evaluations`, 'Count']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {distribution.map((entry, index) => (
              <Cell key={entry.range} fill={BAR_COLOR} opacity={0.6 + index * 0.1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

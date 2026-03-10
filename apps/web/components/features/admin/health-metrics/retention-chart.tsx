'use client';

import { useId } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { MetricCard } from '@edin/shared';

interface RetentionChartProps {
  retention: MetricCard;
}

export function RetentionChart({ retention }: RetentionChartProps) {
  const gradientId = useId();
  const accentColor = '#C4956A';

  return (
    <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-md)]">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-[14px] font-bold text-brand-primary">Retention Rate</h3>
        <span className="text-[28px] font-bold text-brand-primary">
          {retention.value}
          <span className="ml-1 text-[14px] font-normal text-brand-secondary">%</span>
        </span>
      </div>
      <p className="mt-[var(--spacing-xs)] font-serif text-[13px] text-brand-secondary">
        {retention.editorialContext}
      </p>
      {retention.trend.length > 0 && (
        <div className="mt-[var(--spacing-md)]">
          <div className="h-[180px] w-full" role="img" aria-label="Retention trend chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={retention.trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={accentColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={accentColor} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: 'var(--color-brand-secondary)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--color-brand-secondary)' }}
                  axisLine={false}
                  tickLine={false}
                  unit="%"
                  domain={[0, 100]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const point = payload[0].payload as { date: string; value: number };
                    return (
                      <div className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-sm)] shadow-lg">
                        <p className="font-sans text-[12px] text-brand-primary">{point.date}</p>
                        <p className="font-sans text-[12px] font-medium text-brand-primary">
                          {point.value}% retention
                        </p>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={accentColor}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  dot={{ r: 3, fill: accentColor, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: accentColor, strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only" aria-label="Retention trend data">
            <thead>
              <tr>
                <th>Date</th>
                <th>Retention Rate</th>
              </tr>
            </thead>
            <tbody>
              {retention.trend.map((point, i) => (
                <tr key={i}>
                  <td>{point.date}</td>
                  <td>{point.value}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

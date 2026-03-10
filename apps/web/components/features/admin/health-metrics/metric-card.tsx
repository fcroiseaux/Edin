'use client';

import { useId } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import type { MetricCard as MetricCardType } from '@edin/shared';

interface MetricCardProps {
  metric: MetricCardType;
}

export function MetricCard({ metric }: MetricCardProps) {
  const gradientId = useId();
  const accentColor = '#C4956A';

  const statusColor =
    metric.target !== null
      ? metric.value >= metric.target
        ? 'text-green-700'
        : metric.value >= metric.target * 0.8
          ? 'text-brand-primary'
          : 'text-red-700'
      : 'text-brand-primary';

  return (
    <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-md)]">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-[14px] font-bold text-brand-primary">{metric.label}</h3>
        <span className={`text-[28px] font-bold ${statusColor}`}>
          {metric.value}
          {metric.unit && (
            <span className="ml-1 text-[14px] font-normal text-brand-secondary">{metric.unit}</span>
          )}
        </span>
      </div>
      <p className="mt-[var(--spacing-xs)] font-serif text-[13px] text-brand-secondary">
        {metric.editorialContext}
      </p>
      <details className="mt-[var(--spacing-md)]">
        <summary className="cursor-pointer font-sans text-[13px] font-medium text-brand-accent">
          View trend
        </summary>
        <div className="mt-[var(--spacing-sm)]">
          {metric.trend.length > 0 ? (
            <>
              <div className="h-[120px] w-full" aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metric.trend} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <defs>
                      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={accentColor} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={accentColor} stopOpacity={0.03} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.[0]) return null;
                        const point = payload[0].payload as { date: string; value: number };
                        return (
                          <div className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-sm)] shadow-lg">
                            <p className="font-sans text-[12px] text-brand-primary">{point.date}</p>
                            <p className="font-sans text-[12px] font-medium text-brand-primary">
                              {point.value} {metric.unit}
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
                      dot={false}
                      activeDot={{ r: 4, fill: accentColor, strokeWidth: 2, stroke: '#fff' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <table className="sr-only" aria-label={`${metric.label} trend data`}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {metric.trend.map((point, i) => (
                    <tr key={i}>
                      <td>{point.date}</td>
                      <td>
                        {point.value} {metric.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="font-sans text-[13px] text-brand-secondary">
              No trend data available yet.
            </p>
          )}
        </div>
      </details>
    </div>
  );
}

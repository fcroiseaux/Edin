'use client';

import { useId } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { DomainDistributionMetric } from '@edin/shared';

const DOMAIN_COLORS: Record<string, string> = {
  TECHNOLOGY: '#3a7d7e',
  FINTECH: '#c49a3c',
  IMPACT: '#b06b6b',
  GOVERNANCE: '#7b6b8a',
};

interface DomainDistributionChartProps {
  distribution: DomainDistributionMetric[];
}

export function DomainDistributionChart({ distribution }: DomainDistributionChartProps) {
  const chartId = useId();

  if (distribution.length === 0) {
    return (
      <p className="py-[var(--spacing-lg)] text-center font-sans text-[13px] text-brand-secondary">
        No domain data available.
      </p>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-md)]">
      <h3 className="font-serif text-[14px] font-bold text-brand-primary">Domain Balance</h3>
      <p className="mt-[var(--spacing-xs)] font-serif text-[13px] text-brand-secondary">
        Contributor distribution across working domains.
      </p>
      <div
        className="mt-[var(--spacing-md)] h-[200px] w-full"
        role="img"
        aria-label="Domain distribution bar chart"
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={distribution} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="domain"
              tick={{ fontSize: 12, fill: 'var(--color-brand-secondary)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 12, fill: 'var(--color-brand-secondary)' }}
              axisLine={false}
              tickLine={false}
              unit="%"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const d = payload[0].payload as DomainDistributionMetric;
                return (
                  <div className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-sm)] shadow-lg">
                    <p className="font-sans text-[12px] font-medium text-brand-primary">
                      {d.domain}
                    </p>
                    <p className="font-sans text-[12px] text-brand-secondary">
                      {d.count} contributors ({d.percentage}%)
                    </p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="percentage"
              radius={[4, 4, 0, 0]}
              aria-label={`Domain distribution chart ${chartId}`}
            >
              {distribution.map((entry) => (
                <Cell key={entry.domain} fill={DOMAIN_COLORS[entry.domain] ?? '#C4956A'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only" aria-label="Domain distribution data">
        <thead>
          <tr>
            <th>Domain</th>
            <th>Contributors</th>
            <th>Percentage</th>
          </tr>
        </thead>
        <tbody>
          {distribution.map((d) => (
            <tr key={d.domain}>
              <td>{d.domain}</td>
              <td>{d.count}</td>
              <td>{d.percentage}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

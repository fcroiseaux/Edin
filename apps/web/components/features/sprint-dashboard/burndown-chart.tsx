'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { BurndownDataPoint } from '@edin/shared';

interface BurndownChartProps {
  data: BurndownDataPoint[];
  sprintName?: string;
}

export function BurndownChart({ data, sprintName }: BurndownChartProps) {
  const [showTable, setShowTable] = useState(false);

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-[var(--radius-md)] border border-surface-border bg-surface-raised">
        <p className="text-[14px] text-text-tertiary">
          No burndown data available for this sprint.
        </p>
      </div>
    );
  }

  const title = sprintName ? `Burndown — ${sprintName}` : 'Burndown';

  return (
    <section aria-label={title}>
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-[18px] font-semibold text-brand-primary">{title}</h2>
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
          className="mt-[var(--spacing-md)] w-full text-left font-sans text-[14px]"
          aria-label="Sprint burndown data"
        >
          <thead>
            <tr className="border-b border-surface-border">
              <th className="pb-[var(--spacing-sm)] font-medium text-brand-secondary">Date</th>
              <th className="pb-[var(--spacing-sm)] text-right font-medium text-brand-secondary">
                Remaining
              </th>
              <th className="pb-[var(--spacing-sm)] text-right font-medium text-brand-secondary">
                Ideal
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.date} className="border-b border-surface-border/50">
                <td className="py-[var(--spacing-sm)] text-brand-primary">{item.date}</td>
                <td className="py-[var(--spacing-sm)] text-right text-brand-primary">
                  {item.remainingPoints}
                </td>
                <td className="py-[var(--spacing-sm)] text-right text-brand-primary">
                  {Math.round(item.idealPoints * 10) / 10}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div
          className="mt-[var(--spacing-md)]"
          role="img"
          aria-label={`Sprint burndown: starts at ${data[0]?.remainingPoints ?? 0} points, ends at ${data[data.length - 1]?.remainingPoints ?? 0} points`}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: 'var(--color-text-tertiary)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-surface-border)' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'var(--color-text-tertiary)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-surface-border)' }}
                label={{
                  value: 'Story Points',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 12, fill: 'var(--color-text-tertiary)' },
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-surface-border)',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '13px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '13px', fontFamily: 'var(--font-sans)' }} />
              <Line
                type="monotone"
                dataKey="remainingPoints"
                stroke="var(--color-brand-accent)"
                strokeWidth={2}
                dot={{ r: 3 }}
                name="Actual"
              />
              <Line
                type="monotone"
                dataKey="idealPoints"
                stroke="var(--color-text-tertiary)"
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="Ideal"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

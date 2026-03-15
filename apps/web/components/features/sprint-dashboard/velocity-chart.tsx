'use client';

import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { VelocityDataPoint } from '@edin/shared';

interface VelocityChartProps {
  data: VelocityDataPoint[];
}

export function VelocityChart({ data }: VelocityChartProps) {
  const [showTable, setShowTable] = useState(false);

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-[var(--radius-md)] border border-surface-border bg-surface-raised">
        <p className="text-[14px] text-text-tertiary">
          No velocity data available yet. Data will appear once sprints are tracked.
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Sprint velocity">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-[18px] font-semibold text-brand-primary">Velocity</h2>
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
          aria-label="Sprint velocity data"
        >
          <thead>
            <tr className="border-b border-surface-border">
              <th className="pb-[var(--spacing-sm)] font-medium text-brand-secondary">Sprint</th>
              <th className="pb-[var(--spacing-sm)] font-medium text-brand-secondary">End Date</th>
              <th className="pb-[var(--spacing-sm)] text-right font-medium text-brand-secondary">
                Story Points
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.x} className="border-b border-surface-border/50">
                <td className="py-[var(--spacing-sm)] text-brand-primary">{item.label}</td>
                <td className="py-[var(--spacing-sm)] text-brand-primary">{item.x}</td>
                <td className="py-[var(--spacing-sm)] text-right text-brand-primary">{item.y}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div
          className="mt-[var(--spacing-md)]"
          role="img"
          aria-label={`Sprint velocity: ${data.map((d) => `${d.label} ${d.y} points`).join(', ')}`}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" />
              <XAxis
                dataKey="label"
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
                formatter={(value) => [`${value} points`, 'Delivered']}
                contentStyle={{
                  backgroundColor: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-surface-border)',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '13px',
                }}
              />
              <Bar
                dataKey="y"
                fill="var(--color-brand-accent)"
                radius={[4, 4, 0, 0]}
                name="Delivered"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

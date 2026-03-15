'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

interface AccuracyEntry {
  sprintId: string;
  sprintName: string;
  sprintEnd: string;
  plannedPoints: number;
  deliveredPoints: number;
  accuracy: number | null;
}

interface PersonalAccuracyChartProps {
  data: AccuracyEntry[];
}

export function PersonalAccuracyChart({ data }: PersonalAccuracyChartProps) {
  const [showTable, setShowTable] = useState(false);

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-[var(--radius-md)] border border-surface-border bg-surface-raised">
        <p className="text-[14px] text-text-tertiary">
          No estimation accuracy data available yet. Data will appear after your first sprint.
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Estimation accuracy">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-[18px] font-semibold text-brand-primary">
          Estimation Accuracy
        </h2>
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
          aria-label="Estimation accuracy data"
        >
          <thead>
            <tr className="border-b border-surface-border">
              <th className="pb-[var(--spacing-sm)] font-medium text-brand-secondary">Sprint</th>
              <th className="pb-[var(--spacing-sm)] text-right font-medium text-brand-secondary">
                Planned
              </th>
              <th className="pb-[var(--spacing-sm)] text-right font-medium text-brand-secondary">
                Delivered
              </th>
              <th className="pb-[var(--spacing-sm)] text-right font-medium text-brand-secondary">
                Accuracy
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.sprintId} className="border-b border-surface-border/50">
                <td className="py-[var(--spacing-sm)] text-brand-primary">{item.sprintName}</td>
                <td className="py-[var(--spacing-sm)] text-right text-brand-primary">
                  {item.plannedPoints}
                </td>
                <td className="py-[var(--spacing-sm)] text-right text-brand-primary">
                  {item.deliveredPoints}
                </td>
                <td className="py-[var(--spacing-sm)] text-right text-brand-primary">
                  {item.accuracy != null ? `${item.accuracy}%` : '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div
          className="mt-[var(--spacing-md)]"
          role="img"
          aria-label={`Estimation accuracy: ${data.map((d) => `${d.sprintName} ${d.accuracy ?? 'N/A'}%`).join(', ')}`}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" />
              <XAxis
                dataKey="sprintName"
                tick={{ fontSize: 12, fill: 'var(--color-text-tertiary)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-surface-border)' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: 'var(--color-text-tertiary)' }}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-surface-border)' }}
                label={{
                  value: 'Accuracy %',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 12, fill: 'var(--color-text-tertiary)' },
                }}
                domain={[0, 'auto']}
              />
              <Tooltip
                formatter={(value) => [`${value}%`, 'Accuracy']}
                contentStyle={{
                  backgroundColor: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-surface-border)',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '13px',
                }}
              />
              <ReferenceLine
                y={100}
                stroke="var(--color-text-tertiary)"
                strokeDasharray="3 3"
                label={{
                  value: 'Perfect',
                  position: 'right',
                  style: { fontSize: 11, fill: 'var(--color-text-tertiary)' },
                }}
              />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke="var(--color-brand-accent)"
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls
                name="Accuracy"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

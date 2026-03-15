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
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { ContributorAccuracyTrend } from '@edin/shared';

// Colors for different contributors — using CSS-safe palette
const CONTRIBUTOR_COLORS = [
  'var(--color-brand-accent)',
  '#e67e22',
  '#2ecc71',
  '#9b59b6',
  '#e74c3c',
  '#1abc9c',
  '#f39c12',
  '#3498db',
];

interface EstimationAccuracyChartProps {
  data: ContributorAccuracyTrend[];
}

export function EstimationAccuracyChart({ data }: EstimationAccuracyChartProps) {
  const [showTable, setShowTable] = useState(false);

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-[var(--radius-md)] border border-surface-border bg-surface-raised">
        <p className="text-[14px] text-text-tertiary">
          No estimation accuracy data available yet. Data will appear once contributor estimations
          are tracked.
        </p>
      </div>
    );
  }

  // Collect all unique sprint names across all contributors in chronological order
  const sprintNameSet = new Set<string>();
  for (const contributor of data) {
    for (const sprint of contributor.sprints) {
      sprintNameSet.add(sprint.sprintName);
    }
  }
  const sprintNames = Array.from(sprintNameSet);

  // Transform data for Recharts: one data point per sprint, with contributor accuracy as series
  // Use sprint name matching instead of index to handle contributors with different sprint participation
  const chartData = sprintNames.map((name) => {
    const point: Record<string, string | number | null> = { sprint: name };
    for (const contributor of data) {
      const sprintData = contributor.sprints.find((s) => s.sprintName === name);
      point[contributor.contributorId] = sprintData?.accuracy ?? null;
    }
    return point;
  });

  return (
    <section aria-label="Estimation accuracy trends">
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
              <th className="pb-[var(--spacing-sm)] font-medium text-brand-secondary">
                Contributor
              </th>
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
            {data.flatMap((contributor) =>
              contributor.sprints.map((sprint, idx) => (
                <tr
                  key={`${contributor.contributorId}-${sprint.sprintId}`}
                  className="border-b border-surface-border/50"
                >
                  <td className="py-[var(--spacing-sm)] text-brand-primary">
                    {idx === 0 ? contributor.contributorId.slice(0, 8) : ''}
                  </td>
                  <td className="py-[var(--spacing-sm)] text-brand-primary">{sprint.sprintName}</td>
                  <td className="py-[var(--spacing-sm)] text-right text-brand-primary">
                    {sprint.plannedPoints}
                  </td>
                  <td className="py-[var(--spacing-sm)] text-right text-brand-primary">
                    {sprint.deliveredPoints}
                  </td>
                  <td className="py-[var(--spacing-sm)] text-right text-brand-primary">
                    {sprint.accuracy != null ? `${sprint.accuracy}%` : '\u2014'}
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      ) : (
        <div
          className="mt-[var(--spacing-md)]"
          role="img"
          aria-label={`Estimation accuracy trends for ${data.length} contributors across ${sprintNames.length} sprints`}
        >
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-surface-border)" />
              <XAxis
                dataKey="sprint"
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
              <Legend />
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
              {data.map((contributor, idx) => (
                <Line
                  key={contributor.contributorId}
                  type="monotone"
                  dataKey={contributor.contributorId}
                  name={contributor.contributorId.slice(0, 8)}
                  stroke={CONTRIBUTOR_COLORS[idx % CONTRIBUTOR_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

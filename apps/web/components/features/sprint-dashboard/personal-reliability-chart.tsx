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

interface ReliabilityEntry {
  sprintId: string;
  sprintName: string;
  sprintEnd: string;
  deliveryRatio: number | null;
  estimationVariance: number | null;
}

interface PersonalReliabilityChartProps {
  data: ReliabilityEntry[];
  averageDeliveryRatio: number | null;
  averageEstimationVariance: number | null;
}

export function PersonalReliabilityChart({
  data,
  averageDeliveryRatio,
  averageEstimationVariance,
}: PersonalReliabilityChartProps) {
  const [showTable, setShowTable] = useState(false);

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-[var(--radius-md)] border border-surface-border bg-surface-raised">
        <p className="text-[14px] text-text-tertiary">
          No planning reliability data available yet. Data will appear after sprint estimations are
          tracked.
        </p>
      </div>
    );
  }

  // Format delivery ratio as percentage for display
  const chartData = data.map((d) => ({
    ...d,
    deliveryRatioPct: d.deliveryRatio != null ? Math.round(d.deliveryRatio * 100) : null,
  }));

  return (
    <section aria-label="Planning reliability">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-[18px] font-semibold text-brand-primary">
          Planning Reliability
        </h2>
        <button
          onClick={() => setShowTable((prev) => !prev)}
          className="font-sans text-[13px] text-brand-accent underline underline-offset-2 hover:opacity-80"
          aria-label={showTable ? 'Show chart view' : 'Show data table view'}
        >
          {showTable ? 'Show chart' : 'View as table'}
        </button>
      </div>

      {/* Summary stats */}
      <div className="mt-[var(--spacing-sm)] flex gap-[var(--spacing-lg)] font-sans text-[13px] text-text-secondary">
        <span>
          Avg. Delivery Ratio:{' '}
          <strong className="text-brand-primary">
            {averageDeliveryRatio != null ? `${Math.round(averageDeliveryRatio * 100)}%` : '\u2014'}
          </strong>
        </span>
        <span>
          Avg. Estimation Variance:{' '}
          <strong className="text-brand-primary">
            {averageEstimationVariance != null
              ? `${Math.round(averageEstimationVariance)}%`
              : '\u2014'}
          </strong>
        </span>
      </div>

      {showTable ? (
        <table
          className="mt-[var(--spacing-md)] w-full text-left font-sans text-[14px]"
          aria-label="Planning reliability data"
        >
          <thead>
            <tr className="border-b border-surface-border">
              <th className="pb-[var(--spacing-sm)] font-medium text-brand-secondary">Sprint</th>
              <th className="pb-[var(--spacing-sm)] text-right font-medium text-brand-secondary">
                Delivery Ratio
              </th>
              <th className="pb-[var(--spacing-sm)] text-right font-medium text-brand-secondary">
                Est. Variance
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((item) => (
              <tr key={item.sprintId} className="border-b border-surface-border/50">
                <td className="py-[var(--spacing-sm)] text-brand-primary">{item.sprintName}</td>
                <td className="py-[var(--spacing-sm)] text-right text-brand-primary">
                  {item.deliveryRatio != null
                    ? `${Math.round(item.deliveryRatio * 100)}%`
                    : '\u2014'}
                </td>
                <td className="py-[var(--spacing-sm)] text-right text-brand-primary">
                  {item.estimationVariance != null
                    ? `${Math.round(item.estimationVariance)}%`
                    : '\u2014'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div
          className="mt-[var(--spacing-md)]"
          role="img"
          aria-label={`Planning reliability: ${data.map((d) => `${d.sprintName} ${d.deliveryRatio != null ? Math.round(d.deliveryRatio * 100) + '%' : 'N/A'}`).join(', ')}`}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
                  value: 'Delivery %',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 12, fill: 'var(--color-text-tertiary)' },
                }}
                domain={[0, 'auto']}
              />
              <Tooltip
                formatter={(value) => [`${value}%`, 'Delivery Ratio']}
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
                  value: '100%',
                  position: 'right',
                  style: { fontSize: 11, fill: 'var(--color-text-tertiary)' },
                }}
              />
              <Line
                type="monotone"
                dataKey="deliveryRatioPct"
                stroke="var(--color-brand-accent)"
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls
                name="Delivery Ratio"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

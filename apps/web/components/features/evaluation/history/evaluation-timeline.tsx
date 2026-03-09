'use client';

import { useId } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import type { EvaluationHistoryItemDto } from '@edin/shared';
import { scoreToLabel } from '@edin/shared';

interface EvaluationTimelineProps {
  items: EvaluationHistoryItemDto[];
  accentColor?: string;
}

export function EvaluationTimeline({ items, accentColor = '#3A7D7E' }: EvaluationTimelineProps) {
  const gradientId = useId();
  const sortedItems = [...items].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
  );

  const chartData = sortedItems.map((item) => ({
    date: new Date(item.completedAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    score: item.compositeScore,
    title: item.contributionTitle,
    narrative: item.narrativePreview,
    fullDate: item.completedAt,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-[250px] items-center justify-center rounded-[var(--radius-lg)] border border-surface-border bg-surface-base">
        <p className="font-sans text-[14px] text-brand-secondary">
          No completed evaluations to display yet.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="h-[250px] w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={accentColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={accentColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: 'var(--color-brand-secondary)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: 'var(--color-brand-secondary)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.[0]) return null;
                const data = payload[0].payload as (typeof chartData)[0];
                return (
                  <div className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-sm)] shadow-lg">
                    <p className="font-sans text-[12px] font-medium text-brand-primary">
                      {data.title}
                    </p>
                    <p className="font-sans text-[12px] text-brand-secondary">
                      {scoreToLabel(data.score)} ({data.score})
                    </p>
                    {data.narrative && (
                      <p className="mt-[2px] max-w-[220px] font-serif text-[12px] leading-[1.4] text-brand-secondary">
                        {data.narrative}
                      </p>
                    )}
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke={accentColor}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={{ r: 3, fill: accentColor, strokeWidth: 0 }}
              activeDot={{ r: 5, fill: accentColor, strokeWidth: 2, stroke: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Accessible data table for screen readers */}
      <table className="sr-only" aria-label="Evaluation score history">
        <thead>
          <tr>
            <th>Date</th>
            <th>Contribution</th>
            <th>Score</th>
            <th>Quality</th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item) => (
            <tr key={item.id}>
              <td>{new Date(item.completedAt).toLocaleDateString()}</td>
              <td>{item.contributionTitle}</td>
              <td>{item.compositeScore}</td>
              <td>{scoreToLabel(item.compositeScore)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

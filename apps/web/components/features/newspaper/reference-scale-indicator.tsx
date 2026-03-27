'use client';

import { useState } from 'react';
import type { NewspaperEditionDto } from '@edin/shared';

const TIER_CONFIG: Record<number, { label: string; className: string; barColor: string }> = {
  1: { label: 'Notable', className: 'text-text-secondary', barColor: 'bg-surface-subtle' },
  2: {
    label: 'Significant',
    className: 'text-accent-secondary',
    barColor: 'bg-accent-secondary/30',
  },
  3: { label: 'Exceptional', className: 'text-pillar-tech', barColor: 'bg-pillar-tech/30' },
  4: { label: 'Outstanding', className: 'text-pillar-impact', barColor: 'bg-pillar-impact/30' },
  5: { label: 'Breakthrough', className: 'text-pillar-finance', barColor: 'bg-pillar-finance/30' },
};

const ACTIVITY_DOT: Record<string, { color: string; label: string }> = {
  high: { color: 'bg-status-success', label: 'High' },
  'above-average': { color: 'bg-status-success', label: 'Above avg' },
  normal: { color: 'bg-status-warning', label: 'Normal' },
  'below-average': { color: 'bg-text-tertiary', label: 'Below avg' },
  low: { color: 'bg-text-tertiary', label: 'Low' },
};

interface ReferenceScaleIndicatorProps {
  edition: NewspaperEditionDto;
  filteredSignificanceDistribution?: Record<string, number>;
}

/**
 * Derives activity level from the comparison context string.
 * This avoids needing the /scale endpoint for the initial render.
 */
function deriveActivityLevel(comparisonContext: string): string {
  const lower = comparisonContext.toLowerCase();
  if (lower.includes('high activity') || lower.includes('high-activity')) return 'high';
  if (lower.includes('above average')) return 'above-average';
  if (lower.includes('low activity period')) return 'low';
  if (lower.includes('below average')) return 'below-average';
  if (lower.includes('first edition')) return 'normal';
  return 'normal';
}

/**
 * Computes total items from significance distribution tiers.
 */
function totalFromDistribution(dist: Record<string, number>): number {
  return Object.values(dist).reduce((sum, count) => sum + count, 0);
}

/**
 * Builds a compact summary string for the mobile collapsed view.
 */
function compactSummary(edition: NewspaperEditionDto, activityLevel: string): string {
  const { referenceScaleMetadata, eventCount } = edition;

  // Extract a short temporal indicator — e.g., "3 days" from "covers 3 days of activity, Mar 22–25"
  const temporal = referenceScaleMetadata.temporalSpanHumanReadable;
  const daysMatch = temporal.match(/(\d+)\s*days?/);
  const hoursMatch = temporal.match(/(\d+)\s*hours?/);
  const minutesMatch = temporal.match(/(\d+)\s*minutes?/);
  const timeStr = daysMatch
    ? `${daysMatch[1]}d`
    : hoursMatch
      ? `${hoursMatch[1]}h`
      : minutesMatch
        ? `${minutesMatch[1]}m`
        : temporal;

  const dot = ACTIVITY_DOT[activityLevel] ?? ACTIVITY_DOT.normal;
  return `${timeStr} · ${eventCount} events · ${dot.label} activity`;
}

export function ReferenceScaleIndicator({
  edition,
  filteredSignificanceDistribution,
}: ReferenceScaleIndicatorProps) {
  const [expanded, setExpanded] = useState(false);
  const { referenceScaleMetadata, significanceDistribution, eventCount } = edition;
  const activeDistribution = filteredSignificanceDistribution ?? significanceDistribution;
  const activityLevel = deriveActivityLevel(referenceScaleMetadata.comparisonContext);
  const dot = ACTIVITY_DOT[activityLevel] ?? ACTIVITY_DOT.normal;
  const total = totalFromDistribution(activeDistribution);

  return (
    <div
      className="rounded-radius-lg border border-surface-subtle bg-surface-raised"
      role="region"
      aria-label="Reference scale"
    >
      {/* Mobile: compact single-line, expandable */}
      <div className="lg:hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-body-sm text-text-secondary min-h-[44px]"
          aria-expanded={expanded}
          aria-controls="reference-scale-detail"
        >
          <span className="flex items-center gap-2">
            <span className={`inline-block h-2 w-2 rounded-full ${dot.color}`} aria-hidden="true" />
            <span>{compactSummary(edition, activityLevel)}</span>
          </span>
          <span className="text-text-tertiary text-caption" aria-hidden="true">
            {expanded ? '\u25B2' : '\u25BC'}
          </span>
        </button>
        {expanded && (
          <div id="reference-scale-detail" className="px-4 pb-4">
            <ScaleDetail
              referenceScaleMetadata={referenceScaleMetadata}
              significanceDistribution={activeDistribution}
              eventCount={eventCount}
              activityLevel={activityLevel}
              dot={dot}
              total={total}
            />
          </div>
        )}
      </div>

      {/* Desktop: always visible */}
      <div className="hidden lg:block px-5 py-4">
        <ScaleDetail
          referenceScaleMetadata={referenceScaleMetadata}
          significanceDistribution={activeDistribution}
          eventCount={eventCount}
          activityLevel={activityLevel}
          dot={dot}
          total={total}
        />
      </div>
    </div>
  );
}

interface ScaleDetailProps {
  referenceScaleMetadata: NewspaperEditionDto['referenceScaleMetadata'];
  significanceDistribution: Record<string, number>;
  eventCount: number;
  activityLevel: string;
  dot: { color: string; label: string };
  total: number;
}

function ScaleDetail({
  referenceScaleMetadata,
  significanceDistribution,
  activityLevel,
  dot,
  total,
}: ScaleDetailProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
      {/* Temporal context */}
      <div className="flex items-center gap-2 min-w-0">
        <svg
          className="h-4 w-4 shrink-0 text-text-tertiary"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span className="text-body-sm text-text-secondary truncate" data-testid="temporal-context">
          {referenceScaleMetadata.temporalSpanHumanReadable}
        </span>
      </div>

      {/* Significance tier breakdown bar */}
      {total > 0 && (
        <div className="flex items-center gap-2 min-w-0" data-testid="significance-breakdown">
          <div
            className="flex h-2 w-32 sm:w-40 rounded-full overflow-hidden bg-surface-subtle"
            role="img"
            aria-label={`Significance distribution: ${referenceScaleMetadata.significanceSummary}`}
          >
            {[5, 4, 3, 2, 1].map((tier) => {
              const key = tier <= 5 ? `tier${tier}` : `${tier}`;
              // Try both "tierN" and "N" key formats for robustness
              const count =
                significanceDistribution[key] ?? significanceDistribution[String(tier)] ?? 0;
              if (count === 0) return null;
              const widthPercent = (count / total) * 100;
              const config = TIER_CONFIG[tier] ?? TIER_CONFIG[1];
              return (
                <div
                  key={tier}
                  className={`${config.barColor} transition-all`}
                  style={{ width: `${widthPercent}%` }}
                  title={`${config.label}: ${count}`}
                />
              );
            })}
          </div>
          <span className="text-caption text-text-tertiary whitespace-nowrap">
            {referenceScaleMetadata.significanceSummary}
          </span>
        </div>
      )}

      {/* Activity level indicator */}
      <div className="flex items-center gap-1.5" data-testid="activity-level">
        <span className={`inline-block h-2 w-2 rounded-full ${dot.color}`} aria-hidden="true" />
        <span className="text-caption text-text-tertiary whitespace-nowrap">
          {referenceScaleMetadata.comparisonContext}
        </span>
      </div>
    </div>
  );
}

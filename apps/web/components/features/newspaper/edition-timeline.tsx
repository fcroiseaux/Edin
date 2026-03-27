'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import type { NewspaperEditionDto, ActivityLevel } from '@edin/shared';

interface EditionTimelineProps {
  editions: NewspaperEditionDto[];
  currentEditionId: string | null;
  latestEditionId: string | null;
  onEditionSelect: (editionId: string) => void;
  isLoading?: boolean;
}

/**
 * Derives an activity level from the edition's comparison context string.
 * Reuses the same logic as the ReferenceScaleIndicator.
 */
function getActivityLevel(edition: NewspaperEditionDto): ActivityLevel {
  const context = (edition.referenceScaleMetadata?.comparisonContext ?? '').toLowerCase();
  if (context.includes('very high') || context.includes('5x')) return 'high';
  if (context.includes('high') || context.includes('3x') || context.includes('2x'))
    return 'above-average';
  // Check 'below' before 'low' — "below average".includes("low") is true
  if (context.includes('below')) return 'below-average';
  if (context.includes('low') || context.includes('quiet')) return 'low';
  return 'normal';
}

const ACTIVITY_NODE_COLORS: Record<ActivityLevel, string> = {
  high: 'bg-accent-primary/80',
  'above-average': 'bg-accent-primary/60',
  normal: 'bg-surface-elevated',
  'below-average': 'bg-surface-subtle',
  low: 'bg-surface-subtle/60',
};

const ACTIVITY_NODE_BORDERS: Record<ActivityLevel, string> = {
  high: 'border-accent-primary/40',
  'above-average': 'border-accent-primary/30',
  normal: 'border-surface-subtle',
  'below-average': 'border-surface-subtle',
  low: 'border-surface-subtle/60',
};

/**
 * Computes node size proportional to event count.
 * Min 32px (1 event), max 64px (20+ events), linear scale.
 */
function getNodeSize(eventCount: number): number {
  const clamped = Math.min(Math.max(eventCount, 1), 20);
  return 32 + ((clamped - 1) / 19) * 32;
}

/**
 * Computes gap spacing based on temporal distance between editions.
 * Uses discrete categories per NP-NFR1 spirit.
 */
function getGapWidth(gapMs: number): number {
  const gapDays = gapMs / (1000 * 60 * 60 * 24);
  if (gapDays < 1) return 8; // compressed
  if (gapDays <= 3) return 16; // normal
  if (gapDays <= 7) return 32; // wide
  return 48; // extra wide (> 7 days)
}

/**
 * Formats a short date range string from two ISO date strings.
 */
function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const startStr = startDate.toLocaleDateString('en-US', opts);
  const endStr = endDate.toLocaleDateString('en-US', opts);
  return startStr === endStr ? startStr : `${startStr}\u2013${endStr}`;
}

export function EditionTimeline({
  editions,
  currentEditionId,
  latestEditionId,
  onEditionSelect,
  isLoading,
}: EditionTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [focusIndex, setFocusIndex] = useState(-1);

  // Sort editions by editionNumber descending (newest first on right)
  const sortedEditions = useMemo(
    () => [...editions].sort((a, b) => a.editionNumber - b.editionNumber),
    [editions],
  );

  // Scroll to the right end (latest editions) on mount only
  const hasScrolledRef = useRef(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (el && !hasScrolledRef.current) {
      el.scrollLeft = el.scrollWidth;
      hasScrolledRef.current = true;
    }
  }, [sortedEditions.length]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setFocusIndex((prev) => Math.min(prev + 1, sortedEditions.length - 1));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setFocusIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (focusIndex >= 0 && focusIndex < sortedEditions.length) {
          onEditionSelect(sortedEditions[focusIndex].id);
        }
      }
    },
    [sortedEditions, focusIndex, onEditionSelect],
  );

  if (editions.length === 0) return null;

  return (
    <>
      {/* Desktop timeline */}
      <div className="hidden md:block" role="navigation" aria-label="Edition timeline">
        <div className="flex items-center justify-between mb-2">
          <p className="text-caption text-text-tertiary">
            {editions.length} edition{editions.length !== 1 ? 's' : ''}
          </p>
          {isLoading && (
            <span className="text-caption text-text-tertiary animate-pulse">Loading...</span>
          )}
        </div>
        <div
          ref={scrollRef}
          className="overflow-x-auto pb-2"
          style={{ scrollSnapType: 'x mandatory' }}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="listbox"
          aria-label="Select a newspaper edition"
        >
          <div className="flex items-end gap-0 min-w-max px-2">
            {sortedEditions.map((edition, index) => {
              const isCurrent = edition.id === currentEditionId;
              const isLatest = edition.id === latestEditionId;
              const activityLevel = getActivityLevel(edition);
              const nodeSize = getNodeSize(edition.eventCount);
              const isFocused = focusIndex === index;
              const dateRange = formatDateRange(edition.temporalSpanStart, edition.temporalSpanEnd);

              // Compute gap to next edition
              const gap =
                index < sortedEditions.length - 1
                  ? getGapWidth(
                      new Date(sortedEditions[index + 1].temporalSpanStart).getTime() -
                        new Date(edition.temporalSpanEnd).getTime(),
                    )
                  : 0;

              return (
                <div
                  key={edition.id}
                  className="flex flex-col items-center"
                  style={{
                    scrollSnapAlign: 'center',
                    marginRight: gap > 0 ? `${gap}px` : undefined,
                  }}
                >
                  {/* Label above node */}
                  {isLatest && (
                    <span className="text-[0.625rem] font-medium uppercase tracking-wider text-accent-primary mb-1">
                      Latest
                    </span>
                  )}
                  {!isLatest && <div className="h-[calc(0.625rem+0.75rem)]" />}

                  {/* Node */}
                  <button
                    onClick={() => onEditionSelect(edition.id)}
                    className={[
                      'rounded-full border-2 transition-all flex items-center justify-center',
                      ACTIVITY_NODE_COLORS[activityLevel],
                      isCurrent
                        ? 'ring-2 ring-accent-primary ring-offset-2 ring-offset-surface-base border-accent-primary'
                        : ACTIVITY_NODE_BORDERS[activityLevel],
                      isFocused && !isCurrent
                        ? 'ring-1 ring-text-tertiary ring-offset-1 ring-offset-surface-base'
                        : '',
                      'hover:brightness-110 cursor-pointer',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{ width: `${nodeSize}px`, height: `${nodeSize}px` }}
                    title={`Edition #${edition.editionNumber} \u00B7 ${dateRange} \u00B7 ${edition.eventCount} events`}
                    role="option"
                    aria-selected={isCurrent}
                    aria-label={`Edition ${edition.editionNumber}, ${dateRange}, ${edition.eventCount} events${isCurrent ? ', currently viewing' : ''}`}
                  >
                    <span className="text-[0.625rem] font-bold text-text-primary select-none">
                      {edition.editionNumber}
                    </span>
                  </button>

                  {/* Date label below */}
                  <span className="text-[0.5625rem] text-text-tertiary mt-1 whitespace-nowrap">
                    {dateRange}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile compact navigation */}
      <MobileEditionNav
        editions={sortedEditions}
        currentEditionId={currentEditionId}
        latestEditionId={latestEditionId}
        onEditionSelect={onEditionSelect}
        isLoading={isLoading}
      />
    </>
  );
}

interface MobileEditionNavProps {
  editions: NewspaperEditionDto[];
  currentEditionId: string | null;
  latestEditionId: string | null;
  onEditionSelect: (editionId: string) => void;
  isLoading?: boolean;
}

function MobileEditionNav({
  editions,
  currentEditionId,
  latestEditionId,
  onEditionSelect,
  isLoading,
}: MobileEditionNavProps) {
  const [showAll, setShowAll] = useState(false);

  // Find current index in the sorted (ascending) list
  const currentIndex = editions.findIndex((e) => e.id === currentEditionId);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < editions.length - 1;
  const prevEdition = hasPrev ? editions[currentIndex - 1] : null;
  const nextEdition = hasNext ? editions[currentIndex + 1] : null;

  return (
    <div className="md:hidden" role="navigation" aria-label="Edition navigation">
      {/* Previous / Next buttons */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <button
          onClick={() => prevEdition && onEditionSelect(prevEdition.id)}
          disabled={!hasPrev || isLoading}
          className="flex-1 rounded-radius-md border border-surface-subtle px-3 py-2 text-body-sm text-text-secondary transition-colors hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] text-left"
          aria-label={
            prevEdition ? `Previous: Edition ${prevEdition.editionNumber}` : 'No previous edition'
          }
        >
          {prevEdition ? (
            <>
              <span aria-hidden="true">&larr; </span>
              Edition #{prevEdition.editionNumber} &middot;{' '}
              {formatDateRange(prevEdition.temporalSpanStart, prevEdition.temporalSpanEnd)} &middot;{' '}
              {prevEdition.eventCount} events
            </>
          ) : (
            <span className="text-text-tertiary">No earlier editions</span>
          )}
        </button>

        <button
          onClick={() => nextEdition && onEditionSelect(nextEdition.id)}
          disabled={!hasNext || isLoading}
          className="flex-1 rounded-radius-md border border-surface-subtle px-3 py-2 text-body-sm text-text-secondary transition-colors hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px] text-right"
          aria-label={
            nextEdition ? `Next: Edition ${nextEdition.editionNumber}` : 'No next edition'
          }
        >
          {nextEdition ? (
            <>
              Edition #{nextEdition.editionNumber} &middot;{' '}
              {formatDateRange(nextEdition.temporalSpanStart, nextEdition.temporalSpanEnd)} &middot;{' '}
              {nextEdition.eventCount} events
              <span aria-hidden="true"> &rarr;</span>
            </>
          ) : (
            <span className="text-text-tertiary">Latest edition</span>
          )}
        </button>
      </div>

      {/* Browse all editions toggle */}
      <button
        onClick={() => setShowAll(!showAll)}
        className="w-full rounded-radius-md border border-surface-subtle px-3 py-2 text-body-sm text-text-secondary transition-colors hover:bg-surface-raised min-h-[44px] text-center"
        aria-expanded={showAll}
        aria-controls="mobile-edition-list"
      >
        {showAll ? 'Hide all editions' : `Browse all ${editions.length} editions`}
      </button>

      {/* Expandable list */}
      {showAll && (
        <ul
          id="mobile-edition-list"
          className="mt-2 rounded-radius-lg border border-surface-subtle bg-surface-raised divide-y divide-surface-subtle max-h-64 overflow-y-auto"
          role="listbox"
          aria-label="All editions"
        >
          {[...editions].reverse().map((edition) => {
            const isCurrent = edition.id === currentEditionId;
            const isLatest = edition.id === latestEditionId;
            const activityLevel = getActivityLevel(edition);
            const dateRange = formatDateRange(edition.temporalSpanStart, edition.temporalSpanEnd);

            return (
              <li key={edition.id}>
                <button
                  onClick={() => {
                    onEditionSelect(edition.id);
                    setShowAll(false);
                  }}
                  className={[
                    'w-full px-4 py-3 text-left text-body-sm transition-colors min-h-[44px]',
                    isCurrent
                      ? 'bg-accent-primary/10 text-accent-primary'
                      : 'text-text-secondary hover:bg-surface-subtle',
                  ].join(' ')}
                  role="option"
                  aria-selected={isCurrent}
                >
                  <span className="font-medium">Edition #{edition.editionNumber}</span>
                  {isLatest && (
                    <span className="ml-2 text-[0.625rem] font-medium uppercase tracking-wider text-accent-primary">
                      Latest
                    </span>
                  )}
                  <span className="block text-caption text-text-tertiary mt-0.5">
                    {dateRange} &middot; {edition.eventCount} events &middot;{' '}
                    <span className="capitalize">{activityLevel.replace('-', ' ')}</span> activity
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

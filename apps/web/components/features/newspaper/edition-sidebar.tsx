'use client';

import type { NewspaperEditionDto, EditionChannelDto } from '@edin/shared';
import { ChannelFilter } from './channel-filter';

interface EditionSidebarProps {
  edition: NewspaperEditionDto;
  channels: EditionChannelDto[];
  selectedChannelIds: string[];
  onFilterChange: (channelIds: string[]) => void;
}

export function EditionSidebar({
  edition,
  channels,
  selectedChannelIds,
  onFilterChange,
}: EditionSidebarProps) {
  const { referenceScaleMetadata, significanceDistribution, editionNumber } = edition;

  return (
    <aside
      className="rounded-radius-lg bg-surface-raised p-6 border border-surface-subtle"
      aria-label="Edition details"
    >
      <h3 className="font-serif text-[1.25rem] font-bold text-text-primary mb-4">
        Edition #{editionNumber}
      </h3>

      <div className="space-y-4">
        {/* Temporal span */}
        <div>
          <p className="text-caption font-medium uppercase tracking-wider text-text-tertiary mb-1">
            Time Span
          </p>
          <p className="text-body-sm text-text-secondary">
            {referenceScaleMetadata.temporalSpanHumanReadable}
          </p>
        </div>

        {/* Significance summary */}
        <div>
          <p className="text-caption font-medium uppercase tracking-wider text-text-tertiary mb-1">
            Highlights
          </p>
          <p className="text-body-sm text-text-secondary">
            {referenceScaleMetadata.significanceSummary}
          </p>
        </div>

        {/* Density comparison */}
        <div>
          <p className="text-caption font-medium uppercase tracking-wider text-text-tertiary mb-1">
            Activity Level
          </p>
          <p className="text-body-sm text-text-secondary">
            {referenceScaleMetadata.comparisonContext}
          </p>
        </div>

        {/* Significance distribution */}
        {Object.keys(significanceDistribution).length > 0 && (
          <div>
            <p className="text-caption font-medium uppercase tracking-wider text-text-tertiary mb-2">
              Distribution
            </p>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(significanceDistribution)
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([tier, count]) => (
                  <span
                    key={tier}
                    className="inline-flex items-center gap-1 rounded-full bg-surface-subtle px-2 py-0.5 text-caption text-text-secondary"
                  >
                    <span className="font-medium">Tier {tier}:</span> {count}
                  </span>
                ))}
            </div>
          </div>
        )}

        {/* Channel filter */}
        {channels.length > 0 && (
          <div>
            <p className="text-caption font-medium uppercase tracking-wider text-text-tertiary mb-2">
              Channels
            </p>
            <ChannelFilter
              channels={channels}
              selectedChannelIds={selectedChannelIds}
              onFilterChange={onFilterChange}
            />
          </div>
        )}
      </div>
    </aside>
  );
}

'use client';

import type { EditionChannelDto } from '@edin/shared';

interface ChannelFilterProps {
  channels: EditionChannelDto[];
  selectedChannelIds: string[];
  onFilterChange: (channelIds: string[]) => void;
}

export function ChannelFilter({
  channels,
  selectedChannelIds,
  onFilterChange,
}: ChannelFilterProps) {
  const isAllSelected = selectedChannelIds.length === 0;

  const handleChannelClick = (channelId: string) => {
    if (selectedChannelIds.includes(channelId)) {
      // Deselect — remove from selection
      const next = selectedChannelIds.filter((id) => id !== channelId);
      onFilterChange(next);
    } else {
      // Select — add to selection
      onFilterChange([...selectedChannelIds, channelId]);
    }
  };

  const handleAllClick = () => {
    onFilterChange([]);
  };

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Channel filters">
      {/* All Channels button */}
      <button
        onClick={handleAllClick}
        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-body-sm font-medium transition-colors min-h-[36px] ${
          isAllSelected
            ? 'bg-accent-primary/15 text-accent-primary border-accent-primary/30'
            : 'bg-surface-subtle text-text-secondary border-surface-subtle hover:border-text-tertiary'
        }`}
        aria-pressed={isAllSelected}
      >
        All Channels
      </button>

      {/* Channel buttons */}
      {channels.map((channel) => {
        const isSelected = selectedChannelIds.includes(channel.channelId);
        const isMuted = channel.itemCount === 0;

        if (isMuted) {
          return (
            <span
              key={channel.channelId}
              className="inline-flex items-center gap-1 rounded-full border border-surface-subtle bg-surface-subtle px-3 py-1.5 text-body-sm text-text-tertiary opacity-40 cursor-default min-h-[36px]"
              aria-disabled="true"
            >
              {channel.channelName}
              <span className="text-caption">({channel.itemCount})</span>
            </span>
          );
        }

        return (
          <button
            key={channel.channelId}
            onClick={() => handleChannelClick(channel.channelId)}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-body-sm font-medium transition-colors min-h-[36px] ${
              isSelected
                ? 'bg-accent-primary/15 text-accent-primary border-accent-primary/30'
                : 'bg-surface-subtle text-text-secondary border-surface-subtle hover:border-text-tertiary'
            }`}
            aria-pressed={isSelected}
          >
            {channel.channelName}
            <span className="text-caption">({channel.itemCount})</span>
          </button>
        );
      })}
    </div>
  );
}

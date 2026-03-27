'use client';

import type { NewspaperItemDto } from '@edin/shared';
import { NewspaperItemBadge } from './newspaper-item-badge';
import { SourceTypeIcon } from './source-type-icon';
import { NewspaperItemVoteButton } from './newspaper-item-vote-button';

interface HeadlineItemProps {
  item: NewspaperItemDto;
  hasVoted?: boolean;
  isAuthenticated?: boolean;
}

export function HeadlineItem({
  item,
  hasVoted = false,
  isAuthenticated = false,
}: HeadlineItemProps) {
  return (
    <article
      className="rounded-radius-lg bg-surface-raised p-6 md:p-8 border border-surface-subtle"
      aria-label="Headline story"
    >
      <div className="flex items-start gap-4">
        <SourceTypeIcon
          sourceEventType={item.sourceEventType}
          headline={item.headline}
          className="text-[2rem] leading-none shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <NewspaperItemBadge significanceScore={item.significanceScore} />
            <span className="inline-flex items-center rounded-full border border-surface-subtle px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider text-text-secondary">
              {item.channelName}
            </span>
          </div>
          <h2 className="font-serif text-[1.75rem] md:text-[2.25rem] font-bold text-text-heading leading-tight mb-3">
            {item.headline}
          </h2>
          <p className="font-sans text-body text-text-secondary line-clamp-3 mb-4">{item.body}</p>
          <div className="flex items-center justify-between">
            <p className="font-sans text-body-sm text-text-tertiary italic">
              by {item.chathamHouseLabel}
            </p>
            <NewspaperItemVoteButton
              itemId={item.id}
              voteCount={item.communityVoteCount}
              hasVoted={hasVoted}
              isAuthenticated={isAuthenticated}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

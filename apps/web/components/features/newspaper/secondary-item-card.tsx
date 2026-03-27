'use client';

import type { NewspaperItemDto } from '@edin/shared';
import { NewspaperItemBadge } from './newspaper-item-badge';
import { SourceTypeIcon } from './source-type-icon';
import { NewspaperItemVoteButton } from './newspaper-item-vote-button';

interface SecondaryItemCardProps {
  item: NewspaperItemDto;
  hasVoted?: boolean;
  isAuthenticated?: boolean;
}

export function SecondaryItemCard({
  item,
  hasVoted = false,
  isAuthenticated = false,
}: SecondaryItemCardProps) {
  return (
    <article className="rounded-radius-md bg-surface-raised p-4 shadow-sm border border-transparent transition-all hover:border-surface-subtle hover:-translate-y-0.5">
      <div className="flex items-start gap-3">
        <SourceTypeIcon
          sourceEventType={item.sourceEventType}
          headline={item.headline}
          className="text-[1.25rem] leading-none shrink-0 mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <NewspaperItemBadge significanceScore={item.significanceScore} />
            <span className="text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
              {item.channelName}
            </span>
          </div>
          <h3 className="font-serif text-[1.125rem] font-bold text-text-primary leading-snug mb-1.5">
            {item.headline}
          </h3>
          <p className="font-sans text-body-sm text-text-secondary line-clamp-2 mb-2">
            {item.body}
          </p>
          <div className="flex items-center justify-between">
            <p className="font-sans text-caption text-text-tertiary italic">
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

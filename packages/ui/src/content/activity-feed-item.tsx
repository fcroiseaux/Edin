import { forwardRef, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import type { Domain } from '../primitives/badge';
import { PillarAccentLine } from '../domain/pillar-accent-line';
import { DomainBadge } from '../domain/domain-badge';

export interface ActivityFeedItemProps {
  domain: Domain;
  title: string;
  titleHref?: string;
  summary?: string;
  contributorName?: string;
  timestamp?: string;
  renderLink?: (props: { href: string; className: string; children: ReactNode }) => ReactNode;
  className?: string;
}

export const ActivityFeedItem = forwardRef<HTMLLIElement, ActivityFeedItemProps>(
  (
    { domain, title, titleHref, summary, contributorName, timestamp, renderLink, className },
    ref,
  ) => {
    const titleElement = titleHref ? (
      renderLink ? (
        renderLink({
          href: titleHref,
          className:
            'text-body-sm font-medium text-text-primary hover:text-accent-primary transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-primary rounded-sm',
          children: title,
        })
      ) : (
        <a
          href={titleHref}
          className="text-body-sm font-medium text-text-primary hover:text-accent-primary transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-primary rounded-sm"
        >
          {title}
        </a>
      )
    ) : (
      <span className="text-body-sm font-medium text-text-primary">{title}</span>
    );

    return (
      <li ref={ref} className={cn('flex gap-3 py-3', className)}>
        <PillarAccentLine domain={domain} />
        <div className="min-w-0 flex-1">
          <div>{titleElement}</div>
          {summary && <p className="mt-1 text-body-sm text-text-secondary">{summary}</p>}
          <div className="mt-2 flex items-center gap-3 text-caption text-text-tertiary">
            <DomainBadge domain={domain} />
            {contributorName && <span>{contributorName}</span>}
            {timestamp && <span>{timestamp}</span>}
          </div>
        </div>
      </li>
    );
  },
);

ActivityFeedItem.displayName = 'ActivityFeedItem';

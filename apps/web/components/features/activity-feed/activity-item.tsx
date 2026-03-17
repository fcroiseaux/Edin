'use client';

import { DOMAIN_DETAILS } from '@edin/shared';
import type { ActivityEvent } from '@edin/shared';

const EVENT_TYPE_LABELS: Record<string, string> = {
  CONTRIBUTION_NEW: 'New Contribution',
  EVALUATION_COMPLETED: 'Evaluation Completed',
  ANNOUNCEMENT_CREATED: 'Announcement',
  MEMBER_JOINED: 'New Member',
  TASK_COMPLETED: 'Task Completed',
  SPRINT_STARTED: 'Sprint Started',
  SPRINT_COMPLETED: 'Sprint Completed',
  SPRINT_VELOCITY_MILESTONE: 'Velocity Milestone',
};

const SPRINT_EVENT_TYPES = new Set([
  'SPRINT_STARTED',
  'SPRINT_COMPLETED',
  'SPRINT_VELOCITY_MILESTONE',
]);

const SPRINT_ACCENT_COLOR = '#7C3AED';

const CONTRIBUTION_TYPE_ICONS: Record<string, string> = {
  COMMIT: 'Commit',
  PULL_REQUEST: 'PR',
  CODE_REVIEW: 'Review',
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function AvatarFallback({ name, accentColor }: { name: string; accentColor: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="flex h-[36px] w-[36px] flex-shrink-0 items-center justify-center rounded-full font-sans text-[13px] font-medium text-white"
      style={{ backgroundColor: accentColor }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

interface ActivityItemProps {
  activity: ActivityEvent;
  isNew?: boolean;
}

export function ActivityItem({ activity, isNew }: ActivityItemProps) {
  const isSprint = SPRINT_EVENT_TYPES.has(activity.eventType);
  const domainDetail = DOMAIN_DETAILS[activity.domain as keyof typeof DOMAIN_DETAILS];
  const accentColor = isSprint ? SPRINT_ACCENT_COLOR : (domainDetail?.accentColor ?? '#666');
  const eventLabel = EVENT_TYPE_LABELS[activity.eventType] ?? activity.eventType;

  return (
    <div
      role="listitem"
      className={`relative rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)] transition-all duration-200 ease-out hover:-translate-y-[2px] hover:bg-surface-base/50 hover:shadow-md motion-reduce:transform-none motion-reduce:transition-none ${
        isNew ? 'animate-fade-in' : ''
      }`}
      data-testid="activity-item"
    >
      <div className="flex gap-[var(--spacing-md)]">
        {activity.contributorAvatarUrl ? (
          <img
            src={activity.contributorAvatarUrl}
            alt=""
            className="h-[36px] w-[36px] flex-shrink-0 rounded-full"
          />
        ) : (
          <AvatarFallback name={activity.contributorName ?? 'U'} accentColor={accentColor} />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-[var(--spacing-sm)]">
            <div className="min-w-0 flex-1">
              <p className="font-sans text-[15px] font-medium text-brand-primary">
                {activity.title}
              </p>
              {activity.description && (
                <p className="mt-[var(--spacing-xs)] line-clamp-2 font-serif text-[14px] leading-[1.65] text-brand-secondary">
                  {activity.description}
                </p>
              )}
            </div>
            <time
              dateTime={activity.createdAt}
              className="flex-shrink-0 font-sans text-[12px] text-brand-secondary"
            >
              {formatRelativeTime(activity.createdAt)}
            </time>
          </div>

          <div className="mt-[var(--spacing-sm)] flex flex-wrap items-center gap-[var(--spacing-sm)]">
            <span className="inline-flex items-center gap-[4px]">
              <span
                className="inline-block h-[8px] w-[8px] rounded-full"
                style={{ backgroundColor: accentColor }}
                aria-hidden="true"
              />
              <span className="font-sans text-[12px] text-brand-secondary">{activity.domain}</span>
            </span>

            {activity.contributionType && (
              <span className="font-sans text-[12px] text-brand-secondary">
                {CONTRIBUTION_TYPE_ICONS[activity.contributionType] ?? activity.contributionType}
              </span>
            )}

            <span className="font-sans text-[12px] text-brand-secondary/70">{eventLabel}</span>

            {activity.contributorName && (
              <span className="font-sans text-[12px] text-brand-secondary">
                by {activity.contributorName}
              </span>
            )}
          </div>
        </div>
      </div>

      {isNew && (
        <div
          className="absolute right-[var(--spacing-md)] top-[var(--spacing-md)] h-[6px] w-[6px] rounded-full bg-[#C4956A]"
          aria-label="New activity"
        />
      )}
    </div>
  );
}

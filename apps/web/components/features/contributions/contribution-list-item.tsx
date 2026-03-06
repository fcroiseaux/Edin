'use client';

import type { ContributionWithRepository } from '@edin/shared';

const TYPE_ICONS: Record<string, { icon: string; label: string }> = {
  COMMIT: { icon: '⊙', label: 'Commit' },
  PULL_REQUEST: { icon: '⑃', label: 'Pull Request' },
  CODE_REVIEW: { icon: '◎', label: 'Code Review' },
};

function getStatusDisplay(status: string): { label: string; className: string } {
  switch (status) {
    case 'INGESTED':
    case 'ATTRIBUTED':
      return {
        label: 'Awaiting evaluation',
        className: 'bg-surface-sunken text-brand-secondary border-surface-border',
      };
    case 'EVALUATED':
      return {
        label: 'Evaluated',
        className: 'bg-brand-accent/10 text-brand-accent border-brand-accent/20',
      };
    default:
      return {
        label: status,
        className: 'bg-surface-sunken text-brand-secondary border-surface-border',
      };
  }
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString();
}

interface ContributionListItemProps {
  contribution: ContributionWithRepository;
  onSelect: (id: string) => void;
}

export function ContributionListItem({ contribution, onSelect }: ContributionListItemProps) {
  const typeInfo = TYPE_ICONS[contribution.contributionType] ?? {
    icon: '○',
    label: contribution.contributionType,
  };
  const statusDisplay = getStatusDisplay(contribution.status);

  return (
    <button
      type="button"
      onClick={() => onSelect(contribution.id)}
      className="flex w-full items-center gap-[var(--spacing-md)] rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-md)] text-left transition-colors duration-[var(--transition-fast)] hover:bg-surface-sunken focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
      aria-label={`${typeInfo.label}: ${contribution.title}`}
    >
      <div
        className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[var(--radius-md)] border border-surface-border bg-surface-sunken"
        aria-hidden="true"
      >
        <span className="font-sans text-[18px] text-brand-secondary">{typeInfo.icon}</span>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-[15px] font-medium text-brand-primary">
          {contribution.title}
        </p>
        <div className="mt-[2px] flex items-center gap-[var(--spacing-sm)]">
          <span className="font-sans text-[13px] text-brand-secondary">
            {contribution.repositoryName}
          </span>
          <span className="font-sans text-[13px] text-brand-secondary/60" aria-hidden="true">
            ·
          </span>
          <time
            className="font-sans text-[13px] text-brand-secondary/60"
            dateTime={contribution.normalizedAt}
          >
            {formatRelativeTime(contribution.normalizedAt)}
          </time>
        </div>
      </div>

      <span
        className={`shrink-0 rounded-full border px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${statusDisplay.className}`}
      >
        {statusDisplay.label}
      </span>
    </button>
  );
}

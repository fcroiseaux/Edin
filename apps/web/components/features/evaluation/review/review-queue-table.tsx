'use client';

import Link from 'next/link';
import type { EvaluationReviewQueueItemDto } from '@edin/shared';

interface ReviewQueueTableProps {
  items: EvaluationReviewQueueItemDto[];
  isLoading: boolean;
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800',
    CONFIRMED: 'bg-teal-100 text-teal-800',
    OVERRIDDEN: 'bg-violet-100 text-violet-800',
  };
  const classes = colorMap[status] ?? 'bg-gray-100 text-gray-800';

  return (
    <span
      className={`inline-block rounded-full px-[var(--spacing-sm)] py-[2px] text-[12px] font-medium ${classes}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function ReviewQueueTable({ items, isLoading }: ReviewQueueTableProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-[var(--spacing-sm)]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[56px] rounded-[var(--radius-md)] bg-surface-sunken" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-xl)] text-center">
        <p className="font-sans text-[14px] text-brand-secondary">
          No flagged evaluations in the review queue.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-surface-border">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-surface-border bg-surface-sunken">
            <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-left font-sans text-[12px] font-medium uppercase tracking-wider text-brand-secondary">
              Contributor
            </th>
            <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-left font-sans text-[12px] font-medium uppercase tracking-wider text-brand-secondary">
              Contribution
            </th>
            <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-left font-sans text-[12px] font-medium uppercase tracking-wider text-brand-secondary">
              Domain
            </th>
            <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-right font-sans text-[12px] font-medium uppercase tracking-wider text-brand-secondary">
              AI Score
            </th>
            <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-left font-sans text-[12px] font-medium uppercase tracking-wider text-brand-secondary">
              Reason
            </th>
            <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-left font-sans text-[12px] font-medium uppercase tracking-wider text-brand-secondary">
              Flagged
            </th>
            <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-left font-sans text-[12px] font-medium uppercase tracking-wider text-brand-secondary">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr
              key={item.id}
              className="border-b border-surface-border transition-colors last:border-0 hover:bg-surface-sunken/50"
            >
              <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary">
                {item.contributorName}
              </td>
              <td className="max-w-[200px] truncate px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary">
                <Link
                  href={`/admin/evaluations/review-queue/${item.id}`}
                  className="text-brand-accent hover:underline"
                >
                  {item.contributionTitle}
                </Link>
              </td>
              <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[13px] text-brand-secondary">
                {item.domain ?? '—'}
              </td>
              <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-right font-sans text-[14px] text-brand-primary">
                {item.originalScore}
              </td>
              <td className="max-w-[200px] truncate px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[13px] text-brand-secondary">
                {item.flagReason}
              </td>
              <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[13px] text-brand-secondary">
                {formatRelativeTime(item.flaggedAt)}
              </td>
              <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)]">
                <StatusBadge status={item.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

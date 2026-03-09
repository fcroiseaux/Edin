'use client';

import Link from 'next/link';
import { usePendingAssignments } from '../../../hooks/use-feedback-review';

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `Assigned ${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `Assigned ${hours} hour${hours > 1 ? 's' : ''} ago`;
  return 'Assigned just now';
}

export function PendingReviewList() {
  const { data, isPending, error } = usePendingAssignments();

  if (isPending) {
    return (
      <div className="space-y-[var(--spacing-md)]">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-[100px] animate-pulse rounded-[12px] border border-surface-border bg-surface-raised"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="font-sans text-[14px] text-semantic-error">Failed to load pending reviews.</p>
    );
  }

  const assignments = data?.data ?? [];

  if (assignments.length === 0) {
    return (
      <p className="font-sans text-[14px] text-brand-secondary">
        No reviews waiting for you right now.
      </p>
    );
  }

  return (
    <div className="space-y-[var(--spacing-md)]">
      {assignments.map((assignment) => {
        const typeLabel =
          assignment.contributionType === 'COMMIT'
            ? 'Commit'
            : assignment.contributionType === 'PULL_REQUEST'
              ? 'Pull Request'
              : 'Code Review';

        return (
          <div
            key={assignment.id}
            className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-sm transition-shadow duration-200 hover:shadow-md motion-reduce:transition-none"
          >
            <div className="flex items-start justify-between gap-[var(--spacing-md)]">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-[var(--spacing-sm)]">
                  <span className="inline-flex rounded-[var(--radius-sm)] bg-brand-accent-subtle px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium text-brand-accent">
                    {typeLabel}
                  </span>
                </div>
                <h3 className="mt-[var(--spacing-xs)] truncate font-sans text-[14px] font-medium text-brand-primary">
                  {assignment.contributionTitle}
                </h3>
                <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-brand-secondary">
                  {formatTimeAgo(assignment.assignedAt)}
                </p>
              </div>
              <Link
                href={`/dashboard/feedback/review/${assignment.id}`}
                className="inline-flex min-h-[36px] items-center rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-md)] font-sans text-[13px] font-medium text-white transition-[background-color] duration-[var(--transition-fast)] hover:bg-brand-accent/90 motion-reduce:transition-none"
              >
                Review
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

'use client';

import { DOMAIN_COLORS } from '../../../../lib/domain-colors';

interface Review {
  id: string;
  recommendation: string | null;
  feedback: string | null;
  createdAt: string;
  reviewer: { id: string; name: string; domain: string | null; avatarUrl: string | null };
}

interface ReviewFeedbackListProps {
  reviews: Review[];
}

const RECOMMENDATION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  APPROVE: { bg: 'bg-semantic-success/10', text: 'text-semantic-success', label: 'Approve' },
  REQUEST_MORE_INFO: {
    bg: 'bg-semantic-warning/10',
    text: 'text-semantic-warning',
    label: 'Request Info',
  },
  DECLINE: { bg: 'bg-semantic-error/10', text: 'text-semantic-error', label: 'Decline' },
};

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function ReviewFeedbackList({ reviews }: ReviewFeedbackListProps) {
  const submittedReviews = reviews.filter(
    (r) => !!r.feedback && r.feedback.trim().length > 0 && !!r.recommendation,
  );

  if (submittedReviews.length === 0) {
    return <p className="font-sans text-[14px] text-brand-secondary">No reviews submitted yet.</p>;
  }

  return (
    <div className="space-y-[var(--spacing-md)]">
      {submittedReviews.map((review) => {
        const recStyle = RECOMMENDATION_STYLES[review.recommendation] ?? {
          bg: 'bg-surface-sunken',
          text: 'text-brand-secondary',
          label: review.recommendation,
        };
        const domainColor = review.reviewer.domain ? DOMAIN_COLORS[review.reviewer.domain] : null;

        return (
          <div
            key={review.id}
            className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-md)]"
          >
            <div className="flex items-center gap-[var(--spacing-sm)]">
              {review.reviewer.avatarUrl ? (
                <img
                  src={review.reviewer.avatarUrl}
                  alt=""
                  className="h-[32px] w-[32px] rounded-full object-cover"
                />
              ) : (
                <div className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-surface-sunken">
                  <span className="font-sans text-[14px] font-medium text-brand-secondary">
                    {review.reviewer.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <span className="font-sans text-[14px] font-medium text-brand-primary">
                  {review.reviewer.name}
                </span>
                {domainColor && (
                  <span
                    className={`ml-[var(--spacing-xs)] inline-flex items-center rounded-full px-[var(--spacing-xs)] py-[1px] font-sans text-[11px] font-medium ${domainColor.bg} ${domainColor.text}`}
                  >
                    {review.reviewer.domain}
                  </span>
                )}
              </div>
              <span
                className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${recStyle.bg} ${recStyle.text}`}
                role="status"
              >
                {recStyle.label}
              </span>
            </div>
            <p className="mt-[var(--spacing-sm)] font-sans text-[14px] leading-[1.6] text-brand-primary">
              {review.feedback}
            </p>
            <p className="mt-[var(--spacing-xs)] font-sans text-[12px] text-brand-secondary">
              {formatRelativeDate(review.createdAt)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

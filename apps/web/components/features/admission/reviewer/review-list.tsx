'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useMyReviews, useReviewApplicationDetail } from '../../../../hooks/use-admission-reviewer';
import type { AssignedReview } from '../../../../hooks/use-admission-reviewer';
import { DOMAIN_COLORS } from '../../../../lib/domain-colors';
import { ApplicationDetailView } from './application-detail-view';
import { ReviewForm } from './review-form';

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

export function ReviewList() {
  const { reviews, isLoading, error } = useMyReviews();
  const [selectedReview, setSelectedReview] = useState<AssignedReview | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading reviews">
        <div className="space-y-[var(--spacing-md)]">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-md)]"
            >
              <div className="skeleton mb-[var(--spacing-sm)] h-[20px] w-[180px]" />
              <div className="skeleton mb-[var(--spacing-xs)] h-[16px] w-[120px]" />
              <div className="skeleton h-[16px] w-[100px]" />
            </div>
          ))}
        </div>
        <span className="sr-only">Loading your assigned reviews</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="font-sans text-[14px] text-semantic-error">
        Failed to load reviews. Please try again.
      </p>
    );
  }

  const pendingReviews = reviews.filter(
    (r) => (!r.feedback || r.feedback.length === 0) && r.application.status === 'UNDER_REVIEW',
  );
  const completedReviews = reviews.filter((r) => r.feedback && r.feedback.length > 0);

  return (
    <div>
      <h1 className="mb-[var(--spacing-lg)] font-serif text-[28px] font-bold text-brand-primary">
        My Reviews
      </h1>

      {reviews.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-3xl)] text-center">
          <p className="font-sans text-[15px] text-brand-secondary">
            No applications assigned for review.
          </p>
        </div>
      ) : (
        <div className="space-y-[var(--spacing-xl)]">
          {/* Pending reviews */}
          {pendingReviews.length > 0 && (
            <section>
              <h2 className="mb-[var(--spacing-md)] font-sans text-[16px] font-semibold text-brand-primary">
                Pending ({pendingReviews.length})
              </h2>
              <div className="grid gap-[var(--spacing-md)] sm:grid-cols-2">
                {pendingReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    onReview={() => {
                      setSelectedReview(review);
                      setDetailOpen(true);
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Completed reviews */}
          {completedReviews.length > 0 && (
            <section>
              <h2 className="mb-[var(--spacing-md)] font-sans text-[16px] font-semibold text-brand-secondary">
                Completed ({completedReviews.length})
              </h2>
              <div className="grid gap-[var(--spacing-md)] sm:grid-cols-2">
                {completedReviews.map((review) => (
                  <ReviewCard
                    key={review.id}
                    review={review}
                    completed
                    onReview={() => {
                      setSelectedReview(review);
                      setDetailOpen(true);
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {selectedReview && (
        <ReviewDetailDialog
          review={selectedReview}
          open={detailOpen}
          onOpenChange={(open) => {
            setDetailOpen(open);
            if (!open) setSelectedReview(null);
          }}
        />
      )}
    </div>
  );
}

function ReviewCard({
  review,
  completed,
  onReview,
}: {
  review: AssignedReview;
  completed?: boolean;
  onReview: () => void;
}) {
  const domainColor = DOMAIN_COLORS[review.application.domain];

  return (
    <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-md)] shadow-[var(--shadow-card)]">
      <h3 className="font-sans text-[16px] font-medium text-brand-primary">
        {review.application.applicantName}
      </h3>
      <div className="mt-[var(--spacing-xs)] flex items-center gap-[var(--spacing-sm)]">
        {domainColor && (
          <span
            className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${domainColor.bg} ${domainColor.text}`}
          >
            {review.application.domain}
          </span>
        )}
        <span className="font-sans text-[13px] text-brand-secondary">
          {formatRelativeDate(review.application.createdAt)}
        </span>
      </div>
      <div className="mt-[var(--spacing-md)]">
        <button
          type="button"
          onClick={onReview}
          className={`rounded-[var(--radius-md)] px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium transition-[background-color,opacity] duration-[var(--transition-fast)] focus-visible:outline-2 focus-visible:outline-brand-accent focus-visible:outline-offset-2 ${
            completed
              ? 'border border-surface-border bg-surface-raised text-brand-secondary hover:bg-surface-sunken'
              : 'bg-brand-accent text-white hover:bg-brand-accent/90'
          }`}
        >
          {completed ? 'View Details' : 'Review'}
        </button>
      </div>
    </div>
  );
}

function ReviewDetailDialog({
  review,
  open,
  onOpenChange,
}: {
  review: AssignedReview;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { application, isLoading } = useReviewApplicationDetail(
    open ? review.application.id : null,
  );

  const hasSubmitted = review.feedback && review.feedback.length > 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20 motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-40 max-h-[90vh] w-[90vw] max-w-[640px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius-xl)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-modal)] focus:outline-none"
          aria-describedby={undefined}
        >
          <div className="mb-[var(--spacing-md)] flex items-start justify-between">
            <Dialog.Title className="font-serif text-[22px] font-bold text-brand-primary">
              Application Review
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-[var(--radius-sm)] p-[var(--spacing-xs)] text-brand-secondary transition-colors hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-brand-accent"
                aria-label="Close"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d="M6 6L14 14M14 6L6 14"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </Dialog.Close>
          </div>

          {isLoading || !application ? (
            <div role="status" aria-label="Loading application">
              <div className="skeleton mb-[var(--spacing-md)] h-[24px] w-[200px]" />
              <div className="skeleton mb-[var(--spacing-sm)] h-[16px] w-[300px]" />
              <div className="skeleton h-[100px] w-full" />
              <span className="sr-only">Loading application details</span>
            </div>
          ) : (
            <>
              <ApplicationDetailView application={application} />

              <div className="mt-[var(--spacing-xl)] border-t border-surface-border pt-[var(--spacing-lg)]">
                {hasSubmitted ? (
                  <div className="rounded-[var(--radius-md)] border border-surface-border bg-surface-sunken p-[var(--spacing-md)]">
                    <p className="font-sans text-[14px] font-medium text-brand-primary">
                      Your review has been submitted.
                    </p>
                    <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-brand-secondary">
                      Recommendation: {review.recommendation.replace(/_/g, ' ')}
                    </p>
                  </div>
                ) : (
                  <ReviewForm
                    applicationId={application.id}
                    onSuccess={() => onOpenChange(false)}
                  />
                )}
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

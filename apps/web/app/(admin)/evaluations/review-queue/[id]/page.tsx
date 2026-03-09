'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useReviewDetail } from '../../../../../hooks/use-evaluation-review';
import { NarrativeCard } from '../../../../../components/features/evaluation/narrative/narrative-card';
import { DimensionAccordion } from '../../../../../components/features/evaluation/narrative/dimension-accordion';
import { ReviewResolveForm } from '../../../../../components/features/evaluation/review/review-resolve-form';
import type { EvaluationDimensionScoreDto } from '@edin/shared';

export default function ReviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { review, isLoading, error } = useReviewDetail(id);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <div className="animate-pulse space-y-[var(--spacing-md)]">
          <div className="h-8 w-64 rounded bg-surface-sunken" />
          <div className="h-[300px] rounded-[var(--radius-lg)] bg-surface-sunken" />
        </div>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <p className="font-sans text-[14px] text-brand-secondary">
          Review not found or could not be loaded.
        </p>
        <Link
          href="/admin/evaluations/review-queue"
          className="mt-[var(--spacing-sm)] inline-block font-sans text-[14px] text-brand-accent underline"
        >
          Back to review queue
        </Link>
      </div>
    );
  }

  const isResolved = review.status !== 'PENDING';

  return (
    <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <Link
        href="/admin/evaluations/review-queue"
        className="mb-[var(--spacing-md)] inline-block font-sans text-[14px] text-brand-secondary hover:text-brand-primary"
      >
        &larr; Back to review queue
      </Link>

      <h1 className="font-serif text-[24px] font-bold text-brand-primary">
        Review: {review.evaluation.contribution.title}
      </h1>
      <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-brand-secondary">
        Flagged by {review.contributorName} · {new Date(review.flaggedAt).toLocaleDateString()}
      </p>

      <div className="mt-[var(--spacing-lg)] grid grid-cols-1 gap-[var(--spacing-lg)] lg:grid-cols-2">
        {/* Left Panel: Evaluation */}
        <div className="flex flex-col gap-[var(--spacing-md)]">
          <h2 className="font-sans text-[16px] font-medium text-brand-primary">AI Evaluation</h2>
          <NarrativeCard
            narrative={review.evaluation.narrative}
            contributionTitle={review.evaluation.contribution.title}
            contributionType={review.evaluation.contribution.contributionType}
            sourceRef={review.evaluation.contribution.sourceRef}
            completedAt={null}
          />
          <DimensionAccordion
            dimensionScores={
              review.evaluation.dimensionScores as Record<
                string,
                EvaluationDimensionScoreDto
              > | null
            }
          />
          {review.evaluation.model && (
            <p className="font-mono text-[12px] text-brand-secondary">
              Model: {review.evaluation.model.name} {review.evaluation.model.version}
            </p>
          )}
        </div>

        {/* Right Panel: Flag + Resolution */}
        <div className="flex flex-col gap-[var(--spacing-md)]">
          <h2 className="font-sans text-[16px] font-medium text-brand-primary">
            Contributor&apos;s Concern
          </h2>
          <div className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
            <p className="font-sans text-[14px] text-brand-primary leading-relaxed">
              {review.flagReason}
            </p>
          </div>

          {isResolved ? (
            <div className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
              <h3 className="font-sans text-[14px] font-medium text-brand-primary">
                Resolution: {review.status === 'CONFIRMED' ? 'Confirmed' : 'Overridden'}
              </h3>
              {review.reviewReason && (
                <p className="mt-[var(--spacing-sm)] font-sans text-[13px] text-brand-secondary">
                  {review.reviewReason}
                </p>
              )}
              {review.resolvedAt && (
                <p className="mt-[var(--spacing-xs)] font-sans text-[12px] text-brand-secondary">
                  Resolved {new Date(review.resolvedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          ) : (
            <>
              <h2 className="font-sans text-[16px] font-medium text-brand-primary">
                Your Decision
              </h2>
              <div className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
                <ReviewResolveForm
                  reviewId={review.id}
                  currentDimensionScores={
                    review.evaluation.dimensionScores as Record<
                      string,
                      EvaluationDimensionScoreDto
                    > | null
                  }
                  onSuccess={() => router.push('/admin/evaluations/review-queue')}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

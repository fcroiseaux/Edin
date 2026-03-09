'use client';

import { useParams, useRouter } from 'next/navigation';
import { useFeedbackReview, useSubmitFeedback } from '../../../../../../hooks/use-feedback-review';
import { FeedbackRubricForm } from '../../../../../../components/features/feedback/feedback-rubric-form';
import { useToast } from '../../../../../../components/ui/toast';
import type { FeedbackSubmissionDto } from '@edin/shared';

export default function FeedbackReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { data, isPending, error } = useFeedbackReview(params.id);
  const submitFeedback = useSubmitFeedback();

  const handleSubmit = async (formData: FeedbackSubmissionDto) => {
    try {
      await submitFeedback.mutateAsync({ feedbackId: params.id, data: formData });
      toast({ title: 'Feedback submitted.' });
      router.push('/dashboard/feedback');
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to submit feedback',
        variant: 'error',
      });
    }
  };

  if (isPending) {
    return (
      <div className="mx-auto max-w-[800px] p-[var(--spacing-xl)]">
        <div className="space-y-[var(--spacing-lg)]">
          <div className="h-[24px] w-[200px] animate-pulse rounded-[var(--radius-sm)] bg-surface-border" />
          <div className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-sm">
            <div className="space-y-[var(--spacing-md)]">
              <div className="h-[16px] w-3/4 animate-pulse rounded-[var(--radius-sm)] bg-surface-border" />
              <div className="h-[16px] w-1/2 animate-pulse rounded-[var(--radius-sm)] bg-surface-border" />
              <div className="h-[80px] animate-pulse rounded-[var(--radius-sm)] bg-surface-border" />
            </div>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-[var(--spacing-sm)]">
              <div className="h-[14px] w-[150px] animate-pulse rounded-[var(--radius-sm)] bg-surface-border" />
              <div className="flex gap-[var(--spacing-sm)]">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div
                    key={j}
                    className="h-[44px] w-[44px] animate-pulse rounded-[var(--radius-md)] bg-surface-border"
                  />
                ))}
              </div>
              <div className="h-[80px] animate-pulse rounded-[var(--radius-md)] bg-surface-border" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-[800px] p-[var(--spacing-xl)]">
        <div className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-xl)] text-center">
          <p className="font-sans text-[14px] text-brand-secondary">
            {error?.message ?? 'Feedback assignment not found.'}
          </p>
        </div>
      </div>
    );
  }

  const assignment = data.data;

  if (assignment.status === 'COMPLETED') {
    return (
      <div className="mx-auto max-w-[800px] p-[var(--spacing-xl)]">
        <div className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-xl)] text-center">
          <p className="font-sans text-[14px] text-brand-secondary">
            You have already submitted feedback for this contribution.
          </p>
        </div>
      </div>
    );
  }

  const typeLabel =
    assignment.contribution.contributionType === 'COMMIT'
      ? 'Commit'
      : assignment.contribution.contributionType === 'PULL_REQUEST'
        ? 'Pull Request'
        : 'Code Review';

  return (
    <div className="mx-auto max-w-[800px] p-[var(--spacing-xl)]">
      <h1 className="mb-[var(--spacing-lg)] font-serif text-[24px] font-bold text-brand-primary">
        Review Contribution
      </h1>

      {/* Contribution context card */}
      <div className="mb-[var(--spacing-xl)] rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-sm">
        <div className="flex items-start gap-[var(--spacing-md)]">
          <span className="inline-flex rounded-[var(--radius-sm)] bg-brand-accent-subtle px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium text-brand-accent">
            {typeLabel}
          </span>
          {assignment.contributorDomain && (
            <span className="inline-flex rounded-[var(--radius-sm)] bg-surface-base px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium text-brand-secondary">
              {assignment.contributorDomain}
            </span>
          )}
        </div>
        <h2 className="mt-[var(--spacing-sm)] font-sans text-[16px] font-semibold text-brand-primary">
          {assignment.contribution.title}
        </h2>
        {assignment.contribution.description && (
          <p className="mt-[var(--spacing-xs)] font-sans text-[14px] text-brand-secondary">
            {assignment.contribution.description}
          </p>
        )}
        {assignment.contributorName && (
          <p className="mt-[var(--spacing-sm)] font-sans text-[13px] text-brand-secondary">
            By {assignment.contributorName}
          </p>
        )}
      </div>

      <FeedbackRubricForm
        contributionType={assignment.contribution.contributionType}
        onSubmit={handleSubmit}
        isSubmitting={submitFeedback.isPending}
      />
    </div>
  );
}

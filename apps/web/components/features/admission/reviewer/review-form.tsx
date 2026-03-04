'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { submitReviewSchema } from '@edin/shared';
import type { SubmitReviewDto } from '@edin/shared';
import { useSubmitReview } from '../../../../hooks/use-admission-reviewer';
import { useToast } from '../../../ui/toast';

interface ReviewFormProps {
  applicationId: string;
  onSuccess?: () => void;
}

const RECOMMENDATIONS = [
  { value: 'APPROVE', label: 'Approve', description: 'This applicant is ready to join.' },
  {
    value: 'REQUEST_MORE_INFO',
    label: 'Request More Info',
    description: 'More information is needed before a decision.',
  },
  {
    value: 'DECLINE',
    label: 'Decline',
    description: 'This application does not meet the criteria.',
  },
] as const;

export function ReviewForm({ applicationId, onSuccess }: ReviewFormProps) {
  const submitReview = useSubmitReview();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SubmitReviewDto>({
    resolver: zodResolver(submitReviewSchema),
    mode: 'onBlur',
    defaultValues: {
      recommendation: '' as SubmitReviewDto['recommendation'],
      feedback: '',
    },
  });

  const selectedRecommendation = watch('recommendation');

  const onSubmit = async (data: SubmitReviewDto) => {
    try {
      await submitReview.mutateAsync({
        applicationId,
        recommendation: data.recommendation,
        feedback: data.feedback,
      });
      toast({ title: 'Review submitted' });
      onSuccess?.();
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to submit review',
        variant: 'error',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-[var(--spacing-lg)]">
      {/* Recommendation radio group */}
      <fieldset>
        <legend className="mb-[var(--spacing-sm)] font-sans text-[14px] font-semibold text-brand-primary">
          Your Recommendation
        </legend>
        <div className="space-y-[var(--spacing-sm)]">
          {RECOMMENDATIONS.map((rec) => (
            <label
              key={rec.value}
              className={`flex cursor-pointer items-start gap-[var(--spacing-sm)] rounded-[var(--radius-md)] border p-[var(--spacing-md)] transition-[border-color,background-color] duration-[var(--transition-fast)] ${
                selectedRecommendation === rec.value
                  ? 'border-brand-accent bg-brand-accent-subtle/30'
                  : 'border-surface-border hover:border-surface-border-input'
              }`}
            >
              <input
                type="radio"
                {...register('recommendation')}
                value={rec.value}
                className="mt-[2px] h-[18px] w-[18px] shrink-0 accent-brand-accent"
              />
              <div>
                <span className="font-sans text-[14px] font-medium text-brand-primary">
                  {rec.label}
                </span>
                <p className="mt-[2px] font-sans text-[13px] text-brand-secondary">
                  {rec.description}
                </p>
              </div>
            </label>
          ))}
        </div>
        {errors.recommendation && (
          <p
            className="mt-[var(--spacing-xs)] font-sans text-[13px] text-semantic-error"
            role="alert"
          >
            {errors.recommendation.message}
          </p>
        )}
      </fieldset>

      {/* Feedback textarea */}
      <div>
        <label
          htmlFor="review-feedback"
          className="mb-[var(--spacing-sm)] block font-sans text-[14px] font-semibold text-brand-primary"
        >
          Feedback
        </label>
        <textarea
          {...register('feedback')}
          id="review-feedback"
          rows={5}
          placeholder="Share your assessment (min. 10 characters)..."
          className={`w-full resize-none rounded-[var(--radius-md)] border bg-surface-raised px-[var(--spacing-md)] py-[12px] font-sans text-[14px] text-brand-primary transition-[border-color,box-shadow] duration-[var(--transition-fast)] focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 focus:outline-none ${
            errors.feedback ? 'border-semantic-error' : 'border-surface-border-input'
          }`}
          aria-describedby={errors.feedback ? 'feedback-error' : undefined}
          aria-invalid={errors.feedback ? 'true' : undefined}
        />
        {errors.feedback && (
          <p
            id="feedback-error"
            className="mt-[var(--spacing-xs)] font-sans text-[13px] text-semantic-error"
            role="alert"
          >
            {errors.feedback.message}
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitReview.isPending}
        className="w-full rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[12px] font-sans text-[14px] font-medium text-white transition-[background-color,opacity] duration-[var(--transition-fast)] hover:bg-brand-accent/90 focus:ring-2 focus:ring-brand-accent/20 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitReview.isPending ? 'Submitting...' : 'Submit Review'}
      </button>
    </form>
  );
}

'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { feedbackSubmissionSchema, RUBRIC_QUESTIONS, MIN_COMMENT_LENGTH } from '@edin/shared';
import type { FeedbackSubmissionDto } from '@edin/shared';
import { RatingInput } from './rating-input';

interface FeedbackRubricFormProps {
  contributionType: string;
  onSubmit: (data: FeedbackSubmissionDto) => Promise<void>;
  isSubmitting: boolean;
}

export function FeedbackRubricForm({
  contributionType,
  onSubmit,
  isSubmitting,
}: FeedbackRubricFormProps) {
  const filteredQuestions = RUBRIC_QUESTIONS.filter((q) =>
    q.contributionTypes.includes(contributionType as never),
  );

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
  } = useForm<FeedbackSubmissionDto>({
    resolver: zodResolver(feedbackSubmissionSchema),
    mode: 'onBlur',
    defaultValues: {
      responses: filteredQuestions.map((q) => ({
        questionId: q.id,
        rating: undefined as unknown as number,
        comment: '',
      })),
      overallComment: '',
    },
  });

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="mx-auto max-w-[800px] space-y-[var(--spacing-lg)]"
    >
      {filteredQuestions.map((question, index) => {
        const responseErrors = errors.responses?.[index];
        const ratingError = responseErrors?.rating?.message;
        const commentError = responseErrors?.comment?.message;
        const errorId = `${question.id}-error`;

        return (
          <fieldset key={question.id} className="space-y-[var(--spacing-md)]">
            <legend className="font-sans text-[13px] font-medium text-brand-primary">
              {question.text}
            </legend>
            <p className="font-sans text-[13px] text-brand-secondary">{question.description}</p>

            <input
              type="hidden"
              {...register(`responses.${index}.questionId`)}
              value={question.id}
            />

            <Controller
              name={`responses.${index}.rating`}
              control={control}
              render={({ field }) => (
                <RatingInput
                  name={question.id}
                  value={field.value}
                  onChange={field.onChange}
                  error={ratingError}
                />
              )}
            />
            {ratingError && (
              <p className="font-sans text-[13px] text-semantic-error" role="alert">
                {ratingError}
              </p>
            )}

            <textarea
              {...register(`responses.${index}.comment`)}
              placeholder={`Share your thoughts (min. ${MIN_COMMENT_LENGTH} characters)...`}
              rows={3}
              className={`field-sizing-content min-h-[80px] w-full resize-none rounded-[var(--radius-md)] border bg-surface-raised px-[var(--spacing-md)] py-[12px] font-serif text-[14px] text-brand-primary transition-[border-color,box-shadow] duration-[var(--transition-fast)] focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 focus:outline-none motion-reduce:transition-none ${
                commentError ? 'border-semantic-error' : 'border-surface-border-input'
              }`}
              aria-describedby={commentError ? errorId : undefined}
              aria-invalid={commentError ? 'true' : undefined}
            />
            {commentError && (
              <p id={errorId} className="font-sans text-[13px] text-semantic-error" role="alert">
                {commentError}
              </p>
            )}
          </fieldset>
        );
      })}

      {/* Overall comment */}
      <div className="space-y-[var(--spacing-sm)]">
        <label
          htmlFor="overall-comment"
          className="font-sans text-[13px] font-medium text-brand-primary"
        >
          Overall Comment (optional)
        </label>
        <textarea
          {...register('overallComment')}
          id="overall-comment"
          placeholder="Any additional thoughts about this contribution..."
          rows={3}
          className="field-sizing-content min-h-[80px] w-full resize-none rounded-[var(--radius-md)] border border-surface-border-input bg-surface-raised px-[var(--spacing-md)] py-[12px] font-serif text-[14px] text-brand-primary transition-[border-color,box-shadow] duration-[var(--transition-fast)] focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 focus:outline-none motion-reduce:transition-none"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !isValid}
        className="w-full rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[12px] font-sans text-[14px] font-medium text-white transition-[background-color,opacity] duration-[var(--transition-fast)] hover:bg-brand-accent/90 focus:ring-2 focus:ring-brand-accent/20 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
      </button>
    </form>
  );
}

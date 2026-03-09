'use client';

import { useState } from 'react';
import { useResolveReview } from '../../../../hooks/use-evaluation-review';
import type { EvaluationDimensionScoreDto } from '@edin/shared';

interface ReviewResolveFormProps {
  reviewId: string;
  currentDimensionScores: Record<string, EvaluationDimensionScoreDto> | null;
  onSuccess?: () => void;
}

export function ReviewResolveForm({
  reviewId,
  currentDimensionScores,
  onSuccess,
}: ReviewResolveFormProps) {
  const [action, setAction] = useState<'confirm' | 'override'>('confirm');
  const [reviewReason, setReviewReason] = useState('');
  const [compositeScore, setCompositeScore] = useState('');
  const [dimensionOverrides, setDimensionOverrides] = useState<
    Record<string, { score: string; explanation: string }>
  >({});
  const [overrideNarrative, setOverrideNarrative] = useState('');

  const { mutate, isPending } = useResolveReview();

  const dimensionKeys = currentDimensionScores ? Object.keys(currentDimensionScores) : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reviewReason.length < 10 || isPending) return;

    const payload: Parameters<typeof mutate>[0] = {
      reviewId,
      action,
      reviewReason,
    };

    if (action === 'override') {
      const parsedComposite = Number(compositeScore);
      if (
        !compositeScore ||
        isNaN(parsedComposite) ||
        parsedComposite < 0 ||
        parsedComposite > 100
      ) {
        return;
      }

      const scores: Record<string, { score: number; explanation: string }> = {};
      for (const key of dimensionKeys) {
        const override = dimensionOverrides[key];
        const current = currentDimensionScores?.[key];
        scores[key] = {
          score: override?.score ? Number(override.score) : (current?.score ?? 0),
          explanation: override?.explanation || current?.explanation || '',
        };
      }

      payload.overrideScores = {
        compositeScore: parsedComposite,
        dimensionScores: scores,
      };
      if (overrideNarrative) {
        payload.overrideNarrative = overrideNarrative;
      }
    }

    mutate(payload, { onSuccess });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[var(--spacing-md)]">
      <fieldset className="flex flex-col gap-[var(--spacing-sm)]">
        <legend className="font-sans text-[14px] font-medium text-brand-primary">Resolution</legend>
        <label className="flex items-center gap-[var(--spacing-sm)] cursor-pointer">
          <input
            type="radio"
            name="action"
            value="confirm"
            checked={action === 'confirm'}
            onChange={() => setAction('confirm')}
            className="accent-brand-accent"
          />
          <span className="font-sans text-[14px] text-brand-primary">Confirm AI evaluation</span>
        </label>
        <label className="flex items-center gap-[var(--spacing-sm)] cursor-pointer">
          <input
            type="radio"
            name="action"
            value="override"
            checked={action === 'override'}
            onChange={() => setAction('override')}
            className="accent-brand-accent"
          />
          <span className="font-sans text-[14px] text-brand-primary">
            Override with adjusted scores
          </span>
        </label>
      </fieldset>

      <div>
        <label
          htmlFor="review-reason"
          className="block font-sans text-[13px] font-medium text-brand-secondary"
        >
          Reason for decision (min 10 characters)
        </label>
        <textarea
          id="review-reason"
          value={reviewReason}
          onChange={(e) => setReviewReason(e.target.value)}
          rows={3}
          className="mt-[var(--spacing-xs)] w-full resize-none rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary focus:border-brand-accent focus:outline-none"
          placeholder="Explain your decision..."
        />
      </div>

      {action === 'override' && (
        <div className="flex flex-col gap-[var(--spacing-sm)] rounded-[var(--radius-md)] border border-surface-border bg-surface-sunken p-[var(--spacing-md)]">
          <h4 className="font-sans text-[13px] font-medium text-brand-secondary">
            Override Scores
          </h4>

          <div>
            <label
              htmlFor="composite-score"
              className="block font-sans text-[12px] text-brand-secondary"
            >
              Composite Score (0-100)
            </label>
            <input
              id="composite-score"
              type="number"
              min={0}
              max={100}
              value={compositeScore}
              onChange={(e) => setCompositeScore(e.target.value)}
              className="mt-[2px] w-[120px] rounded-[var(--radius-sm)] border border-surface-border bg-surface-base px-[var(--spacing-sm)] py-[2px] font-sans text-[14px] text-brand-primary focus:border-brand-accent focus:outline-none"
            />
          </div>

          {dimensionKeys.map((key) => {
            const current = currentDimensionScores?.[key];
            return (
              <div key={key} className="flex items-center gap-[var(--spacing-sm)]">
                <label className="w-[180px] font-sans text-[12px] text-brand-secondary">
                  {key}
                  <span className="ml-[4px] text-[11px] opacity-70">
                    (current: {current?.score ?? '—'})
                  </span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  placeholder={String(current?.score ?? '')}
                  value={dimensionOverrides[key]?.score ?? ''}
                  onChange={(e) =>
                    setDimensionOverrides((prev) => ({
                      ...prev,
                      [key]: {
                        ...prev[key],
                        score: e.target.value,
                        explanation: prev[key]?.explanation ?? '',
                      },
                    }))
                  }
                  className="w-[80px] rounded-[var(--radius-sm)] border border-surface-border bg-surface-base px-[var(--spacing-sm)] py-[2px] font-sans text-[13px] text-brand-primary focus:border-brand-accent focus:outline-none"
                />
              </div>
            );
          })}

          <div>
            <label
              htmlFor="override-narrative"
              className="block font-sans text-[12px] text-brand-secondary"
            >
              Updated Narrative (optional)
            </label>
            <textarea
              id="override-narrative"
              value={overrideNarrative}
              onChange={(e) => setOverrideNarrative(e.target.value)}
              rows={3}
              className="mt-[2px] w-full resize-none rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[13px] text-brand-primary focus:border-brand-accent focus:outline-none"
            />
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={
            reviewReason.length < 10 ||
            isPending ||
            (action === 'override' &&
              (!compositeScore ||
                isNaN(Number(compositeScore)) ||
                Number(compositeScore) < 0 ||
                Number(compositeScore) > 100))
          }
          className="rounded-[var(--radius-md)] bg-brand-secondary px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending
            ? 'Processing...'
            : action === 'confirm'
              ? 'Confirm Evaluation'
              : 'Override Evaluation'}
        </button>
      </div>
    </form>
  );
}

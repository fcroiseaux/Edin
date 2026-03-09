'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useFlagEvaluation } from '../../../../hooks/use-evaluation-review';

interface FlagEvaluationDialogProps {
  evaluationId: string;
  disabled?: boolean;
  onSuccess?: () => void;
}

const MIN_REASON_LENGTH = 50;

export function FlagEvaluationDialog({
  evaluationId,
  disabled = false,
  onSuccess,
}: FlagEvaluationDialogProps) {
  const [open, setOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const { mutate, isPending } = useFlagEvaluation();

  const charCount = flagReason.length;
  const isValid = charCount >= MIN_REASON_LENGTH;

  const handleSubmit = () => {
    if (!isValid || isPending) return;
    mutate(
      { evaluationId, flagReason },
      {
        onSuccess: () => {
          setFlagReason('');
          setOpen(false);
          onSuccess?.();
        },
      },
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="inline-flex items-center gap-[var(--spacing-xs)] rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[13px] text-brand-secondary transition-colors hover:border-brand-accent hover:text-brand-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          Request Human Review
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-xl)] shadow-[var(--shadow-card)]">
          <Dialog.Title className="font-serif text-[18px] font-bold text-brand-primary">
            Help us improve
          </Dialog.Title>
          <Dialog.Description className="mt-[var(--spacing-xs)] font-sans text-[14px] text-brand-secondary">
            Tell us what you think was missed or evaluated incorrectly. Your feedback helps refine
            our evaluation process.
          </Dialog.Description>

          <div className="mt-[var(--spacing-md)]">
            <textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Describe your concern in detail (minimum 50 characters)..."
              rows={5}
              maxLength={2000}
              className="w-full resize-none rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary placeholder:text-brand-secondary/50 focus:border-brand-accent focus:outline-none"
              aria-label="Reason for review request"
            />
            <div className="mt-[var(--spacing-xs)] flex justify-between font-sans text-[12px] text-brand-secondary">
              <span>
                {charCount < MIN_REASON_LENGTH
                  ? `${MIN_REASON_LENGTH - charCount} more characters needed`
                  : 'Ready to submit'}
              </span>
              <span>{charCount}/2000</span>
            </div>
          </div>

          <div className="mt-[var(--spacing-lg)] flex justify-end gap-[var(--spacing-sm)]">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-[var(--radius-md)] px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-secondary hover:text-brand-primary"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              disabled={!isValid || isPending}
              onClick={handleSubmit}
              className="rounded-[var(--radius-md)] bg-brand-secondary px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? 'Submitting...' : 'Submit Review Request'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

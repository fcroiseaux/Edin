'use client';

import { RATING_LABELS } from '@edin/shared';

interface RatingInputProps {
  name: string;
  value: number | undefined;
  onChange: (value: number) => void;
  error?: string;
}

export function RatingInput({ name, value, onChange, error }: RatingInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent, rating: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const next = Math.min(rating + 1, 5);
      onChange(next);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = Math.max(rating - 1, 1);
      onChange(prev);
    }
  };

  return (
    <div
      className="flex flex-wrap gap-[var(--spacing-sm)]"
      role="radiogroup"
      aria-label={`Rating for ${name}`}
    >
      {[1, 2, 3, 4, 5].map((rating) => {
        const isSelected = value === rating;
        const label = RATING_LABELS[rating];

        return (
          <button
            key={rating}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${rating} - ${label}`}
            tabIndex={isSelected || (!value && rating === 1) ? 0 : -1}
            onClick={() => onChange(rating)}
            onKeyDown={(e) => handleKeyDown(e, rating)}
            className={`flex min-h-[44px] min-w-[44px] flex-col items-center justify-center rounded-[var(--radius-md)] border px-[var(--spacing-sm)] py-[var(--spacing-xs)] font-sans text-[13px] transition-all duration-200 motion-reduce:transition-none ${
              isSelected
                ? 'border-brand-accent bg-brand-accent text-white'
                : 'border-surface-border bg-surface-raised text-brand-primary hover:border-surface-border-input hover:shadow-sm'
            } ${error ? 'border-semantic-error' : ''}`}
          >
            <span className="text-[16px] font-semibold">{rating}</span>
            <span className="mt-[2px] text-center text-[11px] leading-tight opacity-80">
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

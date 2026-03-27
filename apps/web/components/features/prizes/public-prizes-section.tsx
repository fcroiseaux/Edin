'use client';

import { usePublicPrizeAwards } from '../../../hooks/use-prize-awards';

const SIGNIFICANCE_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Notable', color: 'text-text-secondary' },
  2: { label: 'Significant', color: 'text-accent-primary' },
  3: { label: 'Exceptional', color: 'text-[#D97706]' },
};

interface PublicPrizesSectionProps {
  contributorId: string;
}

export function PublicPrizesSection({ contributorId }: PublicPrizesSectionProps) {
  const { awards, isLoading } = usePublicPrizeAwards(contributorId);

  if (isLoading) {
    return null;
  }

  if (awards.length === 0) {
    return null;
  }

  return (
    <section className="mt-[var(--spacing-2xl)]" aria-label="Prizes">
      <h2 className="font-sans text-[14px] font-medium uppercase tracking-wider text-text-secondary">
        Prizes
      </h2>
      <ul className="mt-[var(--spacing-sm)] space-y-[var(--spacing-sm)]">
        {awards.map((award) => {
          const sig = SIGNIFICANCE_LABELS[award.significanceLevel] ?? SIGNIFICANCE_LABELS[1];
          return (
            <li
              key={award.id}
              className="rounded-[var(--radius-md)] border border-surface-subtle p-[var(--spacing-md)]"
            >
              <div className="flex items-center gap-[var(--spacing-xs)]">
                <span className="font-serif text-[15px] font-medium text-text-primary">
                  {award.prizeCategoryName}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[1px] font-sans text-[11px] font-medium ${sig.color} bg-surface-sunken`}
                >
                  {sig.label}
                </span>
                <span className="font-sans text-[12px] text-text-tertiary">
                  {award.channelName}
                </span>
              </div>
              <p className="mt-[var(--spacing-xs)] font-serif text-[14px] leading-[1.55] text-text-secondary">
                {award.narrative}
              </p>
              <p className="mt-[var(--spacing-xs)] font-sans text-[12px] text-text-tertiary">
                {new Date(award.awardedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

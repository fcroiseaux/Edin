'use client';

import { useContributorPublicScores } from '../../../../hooks/use-contributor-public-scores';

interface ContributorScoreSummaryProps {
  contributorId: string;
  showEvaluationScores: boolean;
}

export function ContributorScoreSummary({
  contributorId,
  showEvaluationScores,
}: ContributorScoreSummaryProps) {
  const { scores, isLoading } = useContributorPublicScores(contributorId, showEvaluationScores);

  // Invisible absence: render nothing when not consented or no data
  if (!showEvaluationScores || isLoading || !scores) {
    return null;
  }

  return (
    <section className="mt-[var(--spacing-2xl)]" aria-label="Evaluation summary">
      <h2 className="font-sans text-[14px] font-medium uppercase tracking-wider text-brand-secondary">
        Evaluation Summary
      </h2>
      <div className="mt-[var(--spacing-sm)] rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
        <p className="font-serif text-[15px] leading-[1.65] text-brand-primary">
          {scores.narrative}
        </p>
        {scores.recentScores.length > 0 && (
          <div className="mt-[var(--spacing-md)]">
            <p className="font-sans text-[12px] font-medium uppercase tracking-wider text-brand-secondary">
              Recent Evaluations
            </p>
            <div className="mt-[var(--spacing-xs)] flex flex-wrap gap-[var(--spacing-xs)]">
              {scores.recentScores.slice(0, 5).map((s, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-[4px] rounded-full bg-surface-sunken px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] text-brand-primary"
                >
                  <span className="font-medium">{s.score.toFixed(0)}</span>
                  <span className="text-brand-secondary">{s.contributionType}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

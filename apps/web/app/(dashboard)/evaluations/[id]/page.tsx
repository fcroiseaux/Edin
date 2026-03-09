'use client';

import { use } from 'react';
import Link from 'next/link';
import { useEvaluation } from '../../../../hooks/use-evaluations';
import { useReviewStatus } from '../../../../hooks/use-evaluation-review';
import { NarrativeCard } from '../../../../components/features/evaluation/narrative/narrative-card';
import { DimensionAccordion } from '../../../../components/features/evaluation/narrative/dimension-accordion';
import { ProvenanceSection } from '../../../../components/features/evaluation/narrative/provenance-section';
import { ModelFootnote } from '../../../../components/features/evaluation/narrative/model-footnote';
import { FlagEvaluationDialog } from '../../../../components/features/evaluation/review/flag-evaluation-dialog';
import type { EvaluationDimensionScoreDto } from '@edin/shared';

export default function EvaluationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { evaluation, isLoading, error } = useEvaluation(id);
  const { reviewStatus } = useReviewStatus(id);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[800px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <div className="animate-pulse">
          <div className="mb-[var(--spacing-md)] h-[16px] w-[120px] rounded bg-surface-sunken" />
          <div className="mb-[var(--spacing-xl)] h-[200px] rounded-[var(--radius-lg)] bg-surface-sunken" />
          <div className="flex flex-col gap-[var(--spacing-sm)]">
            <div className="h-[48px] rounded-[var(--radius-md)] bg-surface-sunken" />
            <div className="h-[48px] rounded-[var(--radius-md)] bg-surface-sunken" />
            <div className="h-[48px] rounded-[var(--radius-md)] bg-surface-sunken" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div className="mx-auto max-w-[800px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <p className="font-sans text-[14px] text-brand-secondary">
          Evaluation not found or could not be loaded.
        </p>
        <Link
          href="/dashboard/evaluations"
          className="mt-[var(--spacing-sm)] inline-block font-sans text-[14px] text-brand-accent underline"
        >
          Back to evaluations
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[800px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <Link
        href="/dashboard/evaluations"
        className="mb-[var(--spacing-md)] inline-block font-sans text-[14px] text-brand-secondary hover:text-brand-primary"
      >
        &larr; Back to evaluations
      </Link>

      <div className="flex flex-col gap-[var(--spacing-lg)]">
        <NarrativeCard
          narrative={evaluation.narrative}
          contributionTitle={evaluation.contribution.title}
          contributionType={evaluation.contribution.contributionType}
          sourceRef={evaluation.contribution.sourceRef}
          completedAt={evaluation.completedAt}
        />

        <section aria-label="Quality dimensions">
          <h3 className="mb-[var(--spacing-sm)] font-sans text-[14px] font-medium text-brand-secondary">
            Quality Dimensions
          </h3>
          <DimensionAccordion
            dimensionScores={
              evaluation.dimensionScores as Record<string, EvaluationDimensionScoreDto> | null
            }
          />
        </section>

        <ProvenanceSection
          provenance={evaluation.provenance ?? null}
          rubric={evaluation.rubric ?? null}
        />

        {evaluation.status === 'COMPLETED' && (
          <div className="flex items-center gap-[var(--spacing-md)]">
            {reviewStatus ? (
              <span className="inline-flex items-center gap-[var(--spacing-xs)] rounded-full bg-amber-50 px-[var(--spacing-md)] py-[var(--spacing-xs)] font-sans text-[13px] text-amber-700">
                Human review{' '}
                {reviewStatus.status === 'PENDING'
                  ? 'requested'
                  : reviewStatus.status.toLowerCase()}
              </span>
            ) : (
              <FlagEvaluationDialog evaluationId={id} />
            )}
          </div>
        )}

        <footer className="border-t border-surface-border pt-[var(--spacing-md)]">
          <ModelFootnote model={evaluation.model ?? null} />
        </footer>
      </div>
    </div>
  );
}

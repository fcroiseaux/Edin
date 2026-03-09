'use client';

import { useState } from 'react';
import { dimensionKeyToLabel } from '@edin/shared';
import type { EvaluationProvenanceDto, EvaluationRubricInfoDto } from '@edin/shared';

interface ProvenanceSectionProps {
  provenance: EvaluationProvenanceDto | null;
  rubric: EvaluationRubricInfoDto | null;
}

export function ProvenanceSection({ provenance, rubric }: ProvenanceSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!provenance) return null;

  return (
    <div className="rounded-[var(--radius-md)] border border-surface-border bg-surface-base">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-[var(--spacing-md)] py-[var(--spacing-sm)] text-left transition-colors hover:bg-surface-sunken"
        aria-expanded={isOpen}
      >
        <span className="font-sans text-[13px] font-medium text-brand-secondary">
          How was this calculated?
        </span>
        <svg
          className={`h-[16px] w-[16px] shrink-0 text-brand-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6l4 4 4-4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="border-t border-surface-border px-[var(--spacing-md)] py-[var(--spacing-md)]">
          <div className="mb-[var(--spacing-md)]">
            <h4 className="mb-[var(--spacing-xs)] font-sans text-[12px] font-medium uppercase tracking-wider text-brand-secondary">
              Formula
            </h4>
            <p className="font-mono text-[13px] text-brand-primary">{provenance.formulaVersion}</p>
          </div>

          <div className="mb-[var(--spacing-md)]">
            <h4 className="mb-[var(--spacing-xs)] font-sans text-[12px] font-medium uppercase tracking-wider text-brand-secondary">
              Dimension Weights
            </h4>
            <div className="flex flex-col gap-[2px]">
              {Object.entries(provenance.weights).map(([key, weight]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="font-sans text-[13px] text-brand-primary">
                    {dimensionKeyToLabel(key)}
                  </span>
                  <span className="font-mono text-[13px] text-brand-secondary">
                    {(weight * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-[var(--spacing-xl)]">
            <div>
              <h4 className="mb-[var(--spacing-xs)] font-sans text-[12px] font-medium uppercase tracking-wider text-brand-secondary">
                Complexity Multiplier
              </h4>
              <p className="font-mono text-[13px] text-brand-primary">
                {provenance.taskComplexityMultiplier.toFixed(2)}x
              </p>
            </div>
            <div>
              <h4 className="mb-[var(--spacing-xs)] font-sans text-[12px] font-medium uppercase tracking-wider text-brand-secondary">
                Domain Factor
              </h4>
              <p className="font-mono text-[13px] text-brand-primary">
                {provenance.domainNormalizationFactor.toFixed(2)}x
              </p>
            </div>
          </div>

          {rubric && (
            <div className="mt-[var(--spacing-md)] border-t border-surface-border pt-[var(--spacing-md)]">
              <h4 className="mb-[var(--spacing-xs)] font-sans text-[12px] font-medium uppercase tracking-wider text-brand-secondary">
                Rubric Version
              </h4>
              <p className="font-mono text-[13px] text-brand-primary">{rubric.version}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

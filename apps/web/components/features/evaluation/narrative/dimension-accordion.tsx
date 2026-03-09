'use client';

import * as Accordion from '@radix-ui/react-accordion';
import { scoreToLabel, dimensionKeyToLabel } from '@edin/shared';
import type { EvaluationDimensionScoreDto } from '@edin/shared';

interface DimensionAccordionProps {
  dimensionScores: Record<string, EvaluationDimensionScoreDto> | null;
}

export function DimensionAccordion({ dimensionScores }: DimensionAccordionProps) {
  if (!dimensionScores || Object.keys(dimensionScores).length === 0) {
    return (
      <p className="font-sans text-[14px] text-brand-secondary">
        Dimension scores are not available.
      </p>
    );
  }

  const entries = Object.entries(dimensionScores);

  return (
    <Accordion.Root type="multiple" className="flex flex-col gap-[var(--spacing-sm)]">
      {entries.map(([key, dimension]) => {
        const label = dimensionKeyToLabel(key);
        const qualityLabel = scoreToLabel(dimension.score);
        const progressPercent = Math.min(100, Math.max(0, dimension.score));

        return (
          <Accordion.Item
            key={key}
            value={key}
            className="overflow-hidden rounded-[var(--radius-md)] border border-surface-border bg-surface-base"
          >
            <Accordion.Header>
              <Accordion.Trigger className="group flex w-full items-center justify-between px-[var(--spacing-md)] py-[var(--spacing-sm)] text-left transition-colors hover:bg-surface-sunken">
                <span className="font-sans text-[14px] font-medium text-brand-primary">
                  {qualityLabel} {label.toLowerCase()}
                </span>
                <svg
                  className="h-[16px] w-[16px] shrink-0 text-brand-secondary transition-transform duration-200 group-data-[state=open]:rotate-180"
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
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
              <div className="px-[var(--spacing-md)] pb-[var(--spacing-md)]">
                <div className="mb-[var(--spacing-sm)]">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-[13px] text-brand-secondary">{label}</span>
                    <span className="font-sans text-[13px] text-brand-secondary">
                      {dimension.score}
                    </span>
                  </div>
                  <div
                    className="mt-[4px] h-[4px] w-full overflow-hidden rounded-full bg-surface-sunken"
                    role="progressbar"
                    aria-valuenow={dimension.score}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${label}: ${dimension.score} out of 100`}
                  >
                    <div
                      className="h-full rounded-full bg-brand-accent transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
                <p className="font-sans text-[13px] leading-[1.5] text-brand-secondary">
                  {dimension.explanation}
                </p>
              </div>
            </Accordion.Content>
          </Accordion.Item>
        );
      })}
    </Accordion.Root>
  );
}

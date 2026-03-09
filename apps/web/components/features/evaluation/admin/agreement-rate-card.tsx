'use client';

import type { AgreementRatesResponseDto } from '@edin/shared';

interface AgreementRateCardProps {
  rates: AgreementRatesResponseDto | null;
  isLoading: boolean;
}

const DOMAIN_COLORS: Record<string, string> = {
  TECHNOLOGY: '#3A7D7E',
  FINTECH: '#C49A3C',
  IMPACT: '#B06B6B',
  GOVERNANCE: '#7B6B8A',
};

export function AgreementRateCard({ rates, isLoading }: AgreementRateCardProps) {
  if (isLoading) {
    return (
      <div className="animate-pulse rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
        <div className="h-5 w-48 rounded bg-surface-sunken" />
        <div className="mt-[var(--spacing-md)] h-16 rounded bg-surface-sunken" />
      </div>
    );
  }

  if (!rates || rates.overall.totalReviewed === 0) {
    return (
      <div className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
        <h3 className="font-sans text-[14px] font-medium text-brand-primary">AI-Human Alignment</h3>
        <p className="mt-[var(--spacing-sm)] font-sans text-[13px] text-brand-secondary">
          No human reviews completed yet. Agreement metrics will appear after evaluations are
          reviewed.
        </p>
      </div>
    );
  }

  const { overall, byDomain } = rates;

  return (
    <div className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
      <h3 className="font-sans text-[14px] font-medium text-brand-primary">AI-Human Alignment</h3>

      <div className="mt-[var(--spacing-md)] flex items-baseline gap-[var(--spacing-sm)]">
        <span className="font-sans text-[32px] font-bold" style={{ color: '#c4956a' }}>
          {overall.agreementRate}%
        </span>
        <span className="font-sans text-[13px] text-brand-secondary">
          alignment ({overall.totalReviewed} reviews)
        </span>
      </div>

      <div className="mt-[var(--spacing-xs)] font-sans text-[12px] text-brand-secondary">
        {overall.confirmed} confirmed · {overall.overridden} overridden
      </div>

      {byDomain.length > 0 && (
        <div className="mt-[var(--spacing-md)] flex flex-col gap-[var(--spacing-xs)]">
          <h4 className="font-sans text-[12px] font-medium uppercase tracking-wider text-brand-secondary">
            By Domain
          </h4>
          {byDomain.map((d) => {
            const color = DOMAIN_COLORS[d.domain] ?? '#6b7b8d';
            return (
              <div key={d.domain} className="flex items-center gap-[var(--spacing-sm)]">
                <span className="w-[90px] font-sans text-[12px] text-brand-secondary">
                  {d.domain.charAt(0) + d.domain.slice(1).toLowerCase()}
                </span>
                <div className="flex-1 h-[8px] rounded-full bg-surface-sunken overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${d.agreementRate}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
                <span className="w-[40px] text-right font-sans text-[12px] text-brand-primary">
                  {d.agreementRate}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { forwardRef } from 'react';
import { cn } from '../lib/cn';
import type { Domain } from '../primitives/badge';

const domainTextColors: Record<Domain, string> = {
  tech: 'text-pillar-tech',
  impact: 'text-pillar-impact',
  governance: 'text-pillar-governance',
  finance: 'text-pillar-finance',
};

const domainFilledStyles: Record<Domain, string> = {
  tech: 'bg-pillar-tech/8 border border-pillar-tech text-pillar-tech',
  impact: 'bg-pillar-impact/8 border border-pillar-impact text-pillar-impact',
  governance: 'bg-pillar-governance/8 border border-pillar-governance text-pillar-governance',
  finance: 'bg-pillar-finance/8 border border-pillar-finance text-pillar-finance',
};

export interface DomainBadgeProps {
  domain: Domain;
  variant?: 'text-only' | 'filled';
  className?: string;
}

export const DomainBadge = forwardRef<HTMLSpanElement, DomainBadgeProps>(
  ({ domain, variant = 'text-only', className }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-sm px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.05em]',
        variant === 'filled' ? domainFilledStyles[domain] : domainTextColors[domain],
        className,
      )}
    >
      {domain}
    </span>
  ),
);

DomainBadge.displayName = 'DomainBadge';

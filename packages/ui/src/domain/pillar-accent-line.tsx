import { forwardRef } from 'react';
import { cn } from '../lib/cn';
import type { Domain } from '../primitives/badge';

const domainColors: Record<Domain, string> = {
  tech: 'bg-pillar-tech',
  impact: 'bg-pillar-impact',
  governance: 'bg-pillar-governance',
  finance: 'bg-pillar-finance',
};

export interface PillarAccentLineProps {
  domain: Domain;
  className?: string;
}

export const PillarAccentLine = forwardRef<HTMLDivElement, PillarAccentLineProps>(
  ({ domain, className }, ref) => (
    <div
      ref={ref}
      className={cn('w-[3px] shrink-0 self-stretch rounded-full', domainColors[domain], className)}
      aria-hidden="true"
    />
  ),
);

PillarAccentLine.displayName = 'PillarAccentLine';

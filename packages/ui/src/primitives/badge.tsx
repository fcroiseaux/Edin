import { cn } from '../lib/cn';

export type Domain = 'tech' | 'impact' | 'governance' | 'finance';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'filled';
  domain?: Domain;
  className?: string;
}

const domainTextColor: Record<Domain, string> = {
  tech: 'text-pillar-tech',
  impact: 'text-pillar-impact',
  governance: 'text-pillar-governance',
  finance: 'text-pillar-finance',
};

const domainFilledStyles: Record<Domain, string> = {
  tech: 'bg-pillar-tech/8 border-pillar-tech text-pillar-tech',
  impact: 'bg-pillar-impact/8 border-pillar-impact text-pillar-impact',
  governance: 'bg-pillar-governance/8 border-pillar-governance text-pillar-governance',
  finance: 'bg-pillar-finance/8 border-pillar-finance text-pillar-finance',
};

export function Badge({ children, variant = 'default', domain, className }: BadgeProps) {
  const isFilled = variant === 'filled';

  const domainStyle = domain
    ? isFilled
      ? domainFilledStyles[domain]
      : domainTextColor[domain]
    : undefined;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium',
        !domain && !isFilled && 'text-text-secondary',
        !domain && isFilled && 'border border-surface-subtle bg-surface-subtle text-text-primary',
        isFilled && domain && 'border',
        domainStyle,
        className,
      )}
    >
      {children}
    </span>
  );
}

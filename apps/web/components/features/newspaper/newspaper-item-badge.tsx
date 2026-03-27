'use client';

const TIER_CONFIG: Record<number, { label: string; className: string }> = {
  1: { label: 'Notable', className: 'text-text-secondary bg-surface-subtle' },
  2: { label: 'Significant', className: 'text-accent-secondary bg-accent-secondary/10' },
  3: { label: 'Exceptional', className: 'text-pillar-tech bg-pillar-tech/10' },
  4: { label: 'Outstanding', className: 'text-pillar-impact bg-pillar-impact/10' },
  5: { label: 'Breakthrough', className: 'text-pillar-finance bg-pillar-finance/10' },
};

interface NewspaperItemBadgeProps {
  significanceScore: number;
  className?: string;
}

export function NewspaperItemBadge({ significanceScore, className }: NewspaperItemBadgeProps) {
  const tier = TIER_CONFIG[significanceScore] ?? TIER_CONFIG[1];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider ${tier.className} ${className ?? ''}`}
      data-tier={significanceScore}
    >
      {tier.label}
    </span>
  );
}

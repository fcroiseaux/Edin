'use client';

import Link from 'next/link';
import type { ArticleListItemDto } from '@edin/shared';
import { DOMAIN_COLORS } from '../domain-colors';

interface DraftCardProps {
  article: ArticleListItemDto;
}

export function DraftCard({ article }: DraftCardProps) {
  const domainColor = DOMAIN_COLORS[article.domain] ?? '#6B7B8D';
  const updatedDate = new Date(article.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Link
      href={`/dashboard/publication/${article.id}/edit`}
      className="group block rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-[var(--spacing-md)]">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-serif text-[17px] font-semibold text-brand-primary group-hover:text-brand-accent">
            {article.title || 'Untitled'}
          </h3>
          {article.abstract && (
            <p className="mt-[var(--spacing-xs)] line-clamp-2 font-sans text-[14px] text-brand-secondary">
              {article.abstract}
            </p>
          )}
        </div>
        <span
          className="shrink-0 rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium text-surface-raised"
          style={{ backgroundColor: domainColor }}
        >
          {article.domain}
        </span>
      </div>
      <div className="mt-[var(--spacing-md)] flex items-center gap-[var(--spacing-md)] font-sans text-[12px] text-brand-secondary">
        <span>Last edited {updatedDate}</span>
        <span className="rounded-[4px] bg-surface-sunken px-[var(--spacing-xs)] py-[1px] text-[11px] uppercase">
          {article.status}
        </span>
      </div>
    </Link>
  );
}

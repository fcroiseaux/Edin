'use client';

import Link from 'next/link';
import type { ArticleListItemDto } from '@edin/shared';
import { useDeleteArticle } from '../../../../hooks/use-article';
import { DOMAIN_COLORS } from '../domain-colors';
import { StatusBadge } from '../editorial-workflow/article-lifecycle';

interface DraftCardProps {
  article: ArticleListItemDto;
}

function getCardLink(article: ArticleListItemDto): string {
  // All author-facing statuses link to edit page
  // Editors access review page separately (not through the article list)
  return `/publication/${article.id}/edit`;
}

export function DraftCard({ article }: DraftCardProps) {
  const deleteMutation = useDeleteArticle();
  const domainColor = DOMAIN_COLORS[article.domain] ?? '#6B7B8D';
  const updatedDate = new Date(article.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const isRevisionRequested = article.status === 'REVISION_REQUESTED';

  return (
    <Link
      href={getCardLink(article)}
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
        <StatusBadge status={article.status} domain={article.domain} />
        {isRevisionRequested && (
          <span className="rounded-[4px] bg-[#FAEAE4] px-[var(--spacing-xs)] py-[1px] text-[11px] font-medium text-[#C17C60]">
            Feedback available
          </span>
        )}
        {article.status === 'PUBLISHED' && (
          <Link
            href={`/publication/${article.id}/metrics`}
            onClick={(e) => e.stopPropagation()}
            className="rounded-[4px] px-[var(--spacing-xs)] py-[1px] text-[11px] font-medium text-brand-accent hover:underline"
          >
            View Metrics
          </Link>
        )}
        {article.status === 'DRAFT' && (
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (window.confirm(`Delete "${article.title || 'Untitled'}"?`)) {
                deleteMutation.mutate(article.id);
              }
            }}
            className="ml-auto min-h-[44px] rounded-[4px] px-[var(--spacing-xs)] py-[1px] text-[11px] font-medium text-semantic-error hover:underline disabled:opacity-50"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        )}
        {deleteMutation.isError && (
          <span className="text-[11px] font-medium text-semantic-error">Delete failed</span>
        )}
      </div>
    </Link>
  );
}

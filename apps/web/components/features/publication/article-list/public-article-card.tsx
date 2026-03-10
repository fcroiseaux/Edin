'use client';

import Link from 'next/link';
import type { PublicArticleListItemDto } from '@edin/shared';
import { DOMAIN_COLORS } from '../../../../lib/domain-colors';

interface PublicArticleCardProps {
  article: PublicArticleListItemDto;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function PublicArticleCard({ article }: PublicArticleCardProps) {
  const domainColor = DOMAIN_COLORS[article.domain] ?? DOMAIN_COLORS.Technology;

  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group block rounded-lg border border-surface-border bg-surface-raised p-[var(--spacing-lg)] transition-shadow hover:shadow-[var(--shadow-card)]"
      aria-label={`Read article: ${article.title}`}
    >
      <div className="mb-3 flex items-center gap-3">
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase ${domainColor.bg} ${domainColor.text}`}
        >
          {article.domain}
        </span>
        <span className="text-xs text-brand-secondary">
          {formatRelativeDate(article.publishedAt)}
        </span>
        <span className="text-xs text-brand-secondary">{article.readingTimeMinutes} min read</span>
      </div>

      <h2 className="font-serif text-xl leading-snug font-semibold text-brand-primary group-hover:text-brand-accent">
        {article.title}
      </h2>

      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-brand-secondary">
        {article.abstract}
      </p>

      <div className="mt-4 flex items-center gap-2">
        {article.author.avatarUrl && (
          <img src={article.author.avatarUrl} alt="" className="h-6 w-6 rounded-full" />
        )}
        <span className="text-sm font-medium text-brand-primary">{article.author.name}</span>
      </div>
    </Link>
  );
}

'use client';

import Link from 'next/link';
import type { PublicArticleDetailDto } from '@edin/shared';
import { DOMAIN_COLORS } from '../../../../lib/domain-colors';
import { AuthorByline } from './author-byline';
import { ArticleBodyRenderer } from './article-body-renderer';

interface ArticleReadingViewProps {
  article: PublicArticleDetailDto;
}

function formatPublicationDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function ArticleReadingView({ article }: ArticleReadingViewProps) {
  const domainColor = DOMAIN_COLORS[article.domain] ?? DOMAIN_COLORS.Technology;

  return (
    <main className="min-h-screen bg-surface-raised">
      <article className="mx-auto max-w-[720px] px-[var(--spacing-lg)] py-[var(--spacing-3xl)]">
        {/* Header */}
        <header className="mb-[var(--spacing-2xl)]">
          <div className="mb-[var(--spacing-md)] flex items-center gap-3">
            <span
              className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase ${domainColor.bg} ${domainColor.text}`}
            >
              {article.domain}
            </span>
            <span className="text-sm text-brand-secondary">
              {formatPublicationDate(article.publishedAt)}
            </span>
            <span className="text-sm text-brand-secondary">
              {article.readingTimeMinutes} min read
            </span>
          </div>

          <h1 className="font-serif text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.2] font-bold text-brand-primary">
            {article.title}
          </h1>

          <p className="mt-[var(--spacing-lg)] text-lg leading-relaxed italic text-brand-secondary">
            {article.abstract}
          </p>

          <div className="mt-[var(--spacing-lg)]">
            <AuthorByline author={article.author} editor={article.editor} />
          </div>
        </header>

        {/* Article body */}
        <div className="mb-[var(--spacing-3xl)]">
          <ArticleBodyRenderer body={article.body} />
        </div>

        {/* Evaluation section */}
        {article.evaluationNarrative && (
          <section
            className="mb-[var(--spacing-2xl)] rounded-lg bg-surface-sunken p-[var(--spacing-lg)]"
            aria-label="AI Evaluation"
          >
            <h2 className="mb-[var(--spacing-sm)] font-serif text-lg font-semibold text-brand-primary">
              AI Evaluation
            </h2>
            <p className="text-sm leading-relaxed text-brand-secondary">
              {article.evaluationNarrative}
            </p>
            {article.evaluationScore !== null && (
              <div className="mt-3 flex items-center gap-2">
                <div className="h-2 flex-1 rounded-full bg-surface-border">
                  <div
                    className="h-2 rounded-full bg-brand-accent"
                    style={{ width: `${Math.min(article.evaluationScore * 10, 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-brand-secondary">
                  {article.evaluationScore.toFixed(1)}/10
                </span>
              </div>
            )}
          </section>
        )}

        {/* Footer */}
        <footer className="border-t border-surface-border pt-[var(--spacing-xl)]">
          {/* Author bio card */}
          {article.author.bio && (
            <div className="mb-[var(--spacing-lg)] flex items-start gap-4">
              {article.author.avatarUrl && (
                <img src={article.author.avatarUrl} alt="" className="h-12 w-12 rounded-full" />
              )}
              <div>
                <Link
                  href={`/contributors/${article.author.id}`}
                  className="font-medium text-brand-primary hover:text-brand-accent"
                >
                  {article.author.name}
                </Link>
                <p className="mt-1 text-sm text-brand-secondary">{article.author.bio}</p>
              </div>
            </div>
          )}

          <Link
            href="/articles"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-accent hover:underline"
          >
            ← Back to articles
          </Link>
        </footer>
      </article>
    </main>
  );
}

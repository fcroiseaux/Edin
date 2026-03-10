'use client';

import { useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { PublicArticleListItemDto } from '@edin/shared';
import { usePublicArticles } from '../../../../hooks/use-article';
import { PublicArticleCard } from './public-article-card';

const DOMAINS = ['Technology', 'Fintech', 'Impact', 'Governance'] as const;

const DOMAIN_FILTER_COLORS: Record<string, string> = {
  Technology: 'bg-domain-technology text-white',
  Fintech: 'bg-domain-fintech text-black',
  Impact: 'bg-domain-impact text-black',
  Governance: 'bg-domain-governance text-white',
};

interface ArticleListContentProps {
  initialArticles: PublicArticleListItemDto[];
  initialTotal: number;
}

export function ArticleListContent({ initialArticles, initialTotal }: ArticleListContentProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeDomain = searchParams.get('domain') ?? undefined;

  const { articles, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } = usePublicArticles(
    {
      domain: activeDomain,
      // Pass SSR data as initialData so it's used immediately without a loading flash
      ...(!activeDomain ? { initialData: { articles: initialArticles, total: initialTotal } } : {}),
    },
  );

  const displayArticles = articles;
  const showLoadMore = hasNextPage;

  const setDomainFilter = useCallback(
    (domain: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (domain) {
        params.set('domain', domain);
      } else {
        params.delete('domain');
      }
      router.push(`/articles?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  return (
    <div>
      {/* Domain filter */}
      <nav
        className="mb-[var(--spacing-xl)] flex flex-wrap gap-[var(--spacing-sm)]"
        aria-label="Filter by domain"
      >
        <button
          onClick={() => setDomainFilter(undefined)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            !activeDomain
              ? 'bg-brand-primary text-white'
              : 'bg-surface-sunken text-brand-secondary hover:bg-surface-border'
          }`}
          aria-pressed={!activeDomain}
        >
          All
        </button>
        {DOMAINS.map((domain) => (
          <button
            key={domain}
            onClick={() => setDomainFilter(activeDomain === domain ? undefined : domain)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeDomain === domain
                ? DOMAIN_FILTER_COLORS[domain]
                : 'bg-surface-sunken text-brand-secondary hover:bg-surface-border'
            }`}
            aria-pressed={activeDomain === domain}
          >
            {domain}
          </button>
        ))}
      </nav>

      {/* Article grid */}
      {isPending && articles.length === 0 ? (
        <div className="py-[var(--spacing-3xl)] text-center text-brand-secondary">
          Loading articles...
        </div>
      ) : displayArticles.length === 0 ? (
        <div className="py-[var(--spacing-3xl)] text-center">
          <p className="text-lg font-medium text-brand-primary">No articles found</p>
          <p className="mt-2 text-sm text-brand-secondary">
            {activeDomain
              ? `No published articles in ${activeDomain} yet.`
              : 'No published articles yet.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-[var(--spacing-lg)] md:grid-cols-2">
            {displayArticles.map((article) => (
              <PublicArticleCard key={article.id} article={article} />
            ))}
          </div>

          {showLoadMore && (
            <div className="mt-[var(--spacing-xl)] text-center">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="rounded-lg bg-brand-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {isFetchingNextPage ? 'Loading...' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

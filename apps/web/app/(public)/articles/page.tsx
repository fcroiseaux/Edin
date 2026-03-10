import type { Metadata } from 'next';
import type { PublicArticleListItemDto, PaginationMeta } from '@edin/shared';
import { ArticleListContent } from '../../../components/features/publication/article-list/article-list-content';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface PublishedArticlesApiResponse {
  data: PublicArticleListItemDto[];
  meta: {
    timestamp: string;
    correlationId: string;
    pagination: PaginationMeta;
  };
}

async function fetchInitialArticles(): Promise<{
  articles: PublicArticleListItemDto[];
  total: number;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/articles/published?limit=20`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return { articles: [], total: 0 };
    }

    const body: PublishedArticlesApiResponse = await response.json();
    return {
      articles: body.data ?? [],
      total: body.meta.pagination?.total ?? 0,
    };
  } catch (error) {
    console.error('Failed to fetch published articles for SSR', error);
    return { articles: [], total: 0 };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Articles — Edin',
    description:
      'Read articles from the Edin community. Explore insights across Technology, Fintech, Impact, and Governance from expert contributors.',
    openGraph: {
      title: 'Articles — Edin',
      description:
        'Read articles from the Edin community. Explore insights across Technology, Fintech, Impact, and Governance.',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Articles — Edin',
      description:
        'Read articles from the Edin community. Explore insights across Technology, Fintech, Impact, and Governance.',
    },
  };
}

export default async function ArticlesPage() {
  const { articles, total } = await fetchInitialArticles();

  return (
    <main className="min-h-screen bg-surface-base">
      <section
        className="bg-linear-to-b from-surface-raised to-surface-sunken px-[var(--spacing-lg)] py-[var(--spacing-3xl)]"
        aria-label="Published articles"
      >
        <div className="mx-auto max-w-[1200px] text-center">
          <h1 className="font-serif text-[clamp(2rem,5vw,2.5rem)] leading-[1.2] font-bold text-brand-primary">
            Articles
          </h1>
          <p className="mx-auto mt-[var(--spacing-lg)] max-w-[560px] font-sans text-[15px] leading-[1.5] font-normal text-brand-secondary">
            Explore insights and analysis from our community of contributors across Technology,
            Fintech, Impact, and Governance.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
        <ArticleListContent initialArticles={articles} initialTotal={total} />
      </div>
    </main>
  );
}

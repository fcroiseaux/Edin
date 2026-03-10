import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { PublicArticleDetailDto } from '@edin/shared';
import { ArticleReadingView } from '../../../../components/features/publication/article-reading/article-reading-view';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

interface ArticleApiResponse {
  data: PublicArticleDetailDto;
  meta: { timestamp: string; correlationId: string };
}

async function fetchArticle(slug: string): Promise<PublicArticleDetailDto | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/articles/published/${slug}`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) return null;

    const body: ArticleApiResponse = await response.json();
    return body.data ?? null;
  } catch (error) {
    console.error('Failed to fetch article for SSR', error);
    return null;
  }
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchArticle(slug);

  if (!article) {
    return { title: 'Article Not Found — Edin' };
  }

  return {
    title: `${article.title} — Edin`,
    description: article.abstract,
    openGraph: {
      title: article.title,
      description: article.abstract,
      type: 'article',
      publishedTime: article.publishedAt,
      authors: [article.author.name],
      url: `${SITE_URL}/articles/${article.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.abstract,
    },
  };
}

export default async function ArticleReadingPage({ params }: PageProps) {
  const { slug } = await params;
  const article = await fetchArticle(slug);

  if (!article) {
    notFound();
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    abstract: article.abstract,
    author: { '@type': 'Person', name: article.author.name },
    ...(article.editor ? { editor: { '@type': 'Person', name: article.editor.name } } : {}),
    datePublished: article.publishedAt,
    publisher: { '@type': 'Organization', name: 'Edin' },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/articles/${article.slug}`,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <ArticleReadingView article={article} />
    </>
  );
}

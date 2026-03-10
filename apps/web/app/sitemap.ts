import type { MetadataRoute } from 'next';
import type { SitemapArticleDto } from '@edin/shared';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

interface SitemapApiResponse {
  data: SitemapArticleDto[];
  meta: { timestamp: string; correlationId: string };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/articles`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/contributors`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ];

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/articles/published/sitemap/entries`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) return staticPages;

    const body: SitemapApiResponse = await response.json();
    const articlePages: MetadataRoute.Sitemap = (body.data ?? []).map((article) => ({
      url: `${SITE_URL}/articles/${article.slug}`,
      lastModified: new Date(article.updatedAt),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    return [...staticPages, ...articlePages];
  } catch {
    return staticPages;
  }
}

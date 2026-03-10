import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PublicArticleCard } from './public-article-card';
import type { PublicArticleListItemDto } from '@edin/shared';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockArticle: PublicArticleListItemDto = {
  id: 'article-1',
  title: 'Building Decentralized Systems',
  slug: 'building-decentralized-systems-abc123',
  abstract: 'An exploration of decentralized architecture patterns and their applications.',
  domain: 'Technology',
  publishedAt: new Date().toISOString(),
  readingTimeMinutes: 5,
  author: {
    id: 'author-1',
    name: 'Jane Doe',
    avatarUrl: 'https://example.com/avatar.jpg',
    domain: 'Technology',
    bio: 'A technology contributor.',
  },
};

describe('PublicArticleCard', () => {
  it('renders article title', () => {
    render(<PublicArticleCard article={mockArticle} />);
    expect(screen.getByText('Building Decentralized Systems')).toBeDefined();
  });

  it('renders article abstract', () => {
    render(<PublicArticleCard article={mockArticle} />);
    expect(
      screen.getByText(
        'An exploration of decentralized architecture patterns and their applications.',
      ),
    ).toBeDefined();
  });

  it('renders author name', () => {
    render(<PublicArticleCard article={mockArticle} />);
    expect(screen.getByText('Jane Doe')).toBeDefined();
  });

  it('renders domain badge', () => {
    render(<PublicArticleCard article={mockArticle} />);
    expect(screen.getByText('Technology')).toBeDefined();
  });

  it('renders reading time', () => {
    render(<PublicArticleCard article={mockArticle} />);
    expect(screen.getByText('5 min read')).toBeDefined();
  });

  it('links to the article page', () => {
    render(<PublicArticleCard article={mockArticle} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toBe('/articles/building-decentralized-systems-abc123');
  });

  it('renders author avatar when available', () => {
    const { container } = render(<PublicArticleCard article={mockArticle} />);
    const img = container.querySelector('img');
    expect(img).toBeDefined();
    expect(img?.getAttribute('src')).toBe('https://example.com/avatar.jpg');
  });

  it('renders without avatar when not available', () => {
    const articleNoAvatar = { ...mockArticle, author: { ...mockArticle.author, avatarUrl: null } };
    const { container } = render(<PublicArticleCard article={articleNoAvatar} />);
    expect(container.querySelector('img')).toBeNull();
  });

  it('has accessible aria-label', () => {
    render(<PublicArticleCard article={mockArticle} />);
    const link = screen.getByRole('link');
    expect(link.getAttribute('aria-label')).toBe('Read article: Building Decentralized Systems');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArticleReadingView } from './article-reading-view';
import type { PublicArticleDetailDto } from '@edin/shared';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock the body renderer (Tiptap requires DOM environment)
vi.mock('./article-body-renderer', () => ({
  ArticleBodyRenderer: ({ body }: { body: string }) => <div data-testid="article-body">{body}</div>,
}));

const mockArticle: PublicArticleDetailDto = {
  id: 'article-1',
  title: 'The Future of Decentralized Finance',
  slug: 'future-decentralized-finance-abc123',
  abstract: 'An in-depth look at DeFi protocols and their impact on traditional finance.',
  body: '{"type":"doc","content":[]}',
  domain: 'Fintech',
  publishedAt: '2026-03-05T10:00:00.000Z',
  readingTimeMinutes: 8,
  author: {
    id: 'author-1',
    name: 'Alice Smith',
    avatarUrl: 'https://example.com/alice.jpg',
    domain: 'Fintech',
    bio: 'DeFi researcher and contributor.',
  },
  editor: {
    id: 'editor-1',
    name: 'Bob Jones',
    avatarUrl: 'https://example.com/bob.jpg',
    domain: 'Fintech',
  },
  evaluationScore: null,
  evaluationNarrative: null,
};

describe('ArticleReadingView', () => {
  it('renders article title', () => {
    render(<ArticleReadingView article={mockArticle} />);
    expect(screen.getByText('The Future of Decentralized Finance')).toBeDefined();
  });

  it('renders article abstract', () => {
    render(<ArticleReadingView article={mockArticle} />);
    expect(
      screen.getByText(
        'An in-depth look at DeFi protocols and their impact on traditional finance.',
      ),
    ).toBeDefined();
  });

  it('renders domain badge', () => {
    render(<ArticleReadingView article={mockArticle} />);
    const domainBadges = screen.getAllByText('Fintech');
    expect(domainBadges.length).toBeGreaterThan(0);
  });

  it('renders publication date', () => {
    render(<ArticleReadingView article={mockArticle} />);
    expect(screen.getByText('March 5, 2026')).toBeDefined();
  });

  it('renders reading time', () => {
    render(<ArticleReadingView article={mockArticle} />);
    expect(screen.getByText('8 min read')).toBeDefined();
  });

  it('renders author name linked to profile', () => {
    render(<ArticleReadingView article={mockArticle} />);
    const authorLinks = screen.getAllByText('Alice Smith');
    expect(authorLinks.length).toBeGreaterThan(0);
  });

  it('renders editor credit', () => {
    render(<ArticleReadingView article={mockArticle} />);
    expect(screen.getByText('Bob Jones')).toBeDefined();
  });

  it('renders back link to articles', () => {
    render(<ArticleReadingView article={mockArticle} />);
    const backLink = screen.getByText('← Back to articles');
    expect(backLink.closest('a')?.getAttribute('href')).toBe('/articles');
  });

  it('does not render evaluation section when no evaluation', () => {
    render(<ArticleReadingView article={mockArticle} />);
    expect(screen.queryByText('AI Evaluation')).toBeNull();
  });

  it('renders evaluation section when evaluation exists', () => {
    const articleWithEval = {
      ...mockArticle,
      evaluationScore: 7.5,
      evaluationNarrative: 'This article demonstrates strong analytical depth.',
    };
    render(<ArticleReadingView article={articleWithEval} />);
    expect(screen.getByText('AI Evaluation')).toBeDefined();
    expect(screen.getByText('This article demonstrates strong analytical depth.')).toBeDefined();
    expect(screen.getByText('7.5/10')).toBeDefined();
  });

  it('does not render editor when article has no editor', () => {
    const articleNoEditor = { ...mockArticle, editor: null };
    render(<ArticleReadingView article={articleNoEditor} />);
    expect(screen.queryByText('Bob Jones')).toBeNull();
  });
});

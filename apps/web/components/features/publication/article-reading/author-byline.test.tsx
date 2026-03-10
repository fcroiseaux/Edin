import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuthorByline } from './author-byline';
import type { PublicArticleAuthorDto, PublicArticleEditorDto } from '@edin/shared';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockAuthor: PublicArticleAuthorDto = {
  id: 'author-1',
  name: 'Alice Smith',
  avatarUrl: 'https://example.com/alice.jpg',
  domain: 'Technology',
  bio: 'Tech contributor.',
};

const mockEditor: PublicArticleEditorDto = {
  id: 'editor-1',
  name: 'Bob Jones',
  avatarUrl: 'https://example.com/bob.jpg',
  domain: 'Technology',
};

describe('AuthorByline', () => {
  it('renders author name linked to profile', () => {
    render(<AuthorByline author={mockAuthor} editor={null} />);
    const link = screen.getByText('Alice Smith');
    expect(link.closest('a')?.getAttribute('href')).toBe('/contributors/author-1');
  });

  it('renders author domain badge', () => {
    render(<AuthorByline author={mockAuthor} editor={null} />);
    expect(screen.getByText('Technology')).toBeDefined();
  });

  it('renders author avatar', () => {
    const { container } = render(<AuthorByline author={mockAuthor} editor={null} />);
    const img = container.querySelector('img');
    expect(img).toBeDefined();
    expect(img?.getAttribute('src')).toBe('https://example.com/alice.jpg');
  });

  it('renders editor credit when editor provided', () => {
    render(<AuthorByline author={mockAuthor} editor={mockEditor} />);
    expect(screen.getByText('Bob Jones')).toBeDefined();
  });

  it('renders editor link to profile', () => {
    render(<AuthorByline author={mockAuthor} editor={mockEditor} />);
    const editorLink = screen.getByText('Bob Jones');
    expect(editorLink.closest('a')?.getAttribute('href')).toBe('/contributors/editor-1');
  });

  it('does not render editor section when no editor', () => {
    render(<AuthorByline author={mockAuthor} editor={null} />);
    expect(screen.queryByText('Reviewed by')).toBeNull();
  });

  it('renders without avatar when not available', () => {
    const authorNoAvatar = { ...mockAuthor, avatarUrl: null };
    const { container } = render(<AuthorByline author={authorNoAvatar} editor={null} />);
    expect(container.querySelector('img')).toBeNull();
  });
});

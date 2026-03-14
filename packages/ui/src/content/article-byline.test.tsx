import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ArticleByline } from './article-byline';

const author = {
  name: 'Clara Chen',
  role: 'Author',
  avatarFallback: 'CC',
  profileHref: '/profile/clara',
};
const editor = {
  name: 'Marcus Kim',
  role: 'Editor',
  avatarFallback: 'MK',
  profileHref: '/profile/marcus',
};

describe('ArticleByline', () => {
  it('renders author name and role', () => {
    render(<ArticleByline author={author} />);
    expect(screen.getByText('Clara Chen')).toBeDefined();
    expect(screen.getByText('Author')).toBeDefined();
  });

  it('renders avatar fallback', () => {
    render(<ArticleByline author={author} />);
    expect(screen.getByText('CC')).toBeDefined();
  });

  it('renders single variant (no editor)', () => {
    const { container } = render(<ArticleByline author={author} />);
    // No separator when editor is absent
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('renders dual variant with editor and separator', () => {
    render(<ArticleByline author={author} editor={editor} />);
    expect(screen.getByText('Clara Chen')).toBeDefined();
    expect(screen.getByText('Marcus Kim')).toBeDefined();
    expect(screen.getByText('Editor')).toBeDefined();
  });

  it('renders separator between author and editor', () => {
    const { container } = render(<ArticleByline author={author} editor={editor} />);
    const separator = container.querySelector('[aria-hidden="true"]');
    expect(separator?.className).toContain('bg-surface-subtle');
  });

  it('renders multi-author variant', () => {
    render(
      <ArticleByline
        author={author}
        additionalAuthors={[{ name: 'Amir Hassan', role: 'Co-author', avatarFallback: 'AH' }]}
      />,
    );
    expect(screen.getByText('Clara Chen')).toBeDefined();
    expect(screen.getByText('Amir Hassan')).toBeDefined();
  });

  it('renders author name as link when profileHref provided', () => {
    render(<ArticleByline author={author} />);
    const link = screen.getByText('Clara Chen').closest('a');
    expect(link?.getAttribute('href')).toBe('/profile/clara');
  });

  it('uses renderLink when provided', () => {
    const renderLink = ({
      children,
      ...props
    }: {
      href: string;
      className: string;
      children: ReactNode;
    }) => (
      <a data-custom="true" {...props}>
        {children}
      </a>
    );
    render(<ArticleByline author={author} renderLink={renderLink} />);
    const link = screen.getByText('Clara Chen').closest('a');
    expect(link?.getAttribute('data-custom')).toBe('true');
  });

  it('merges custom className', () => {
    const { container } = render(<ArticleByline author={author} className="custom-byline" />);
    expect(container.firstElementChild?.className).toContain('custom-byline');
  });
});

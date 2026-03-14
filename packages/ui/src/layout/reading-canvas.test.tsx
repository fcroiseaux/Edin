import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReadingCanvas } from './reading-canvas';

describe('ReadingCanvas', () => {
  it('renders children', () => {
    render(<ReadingCanvas>Article content</ReadingCanvas>);
    expect(screen.getByText('Article content')).toBeDefined();
  });

  it('uses article landmark', () => {
    render(<ReadingCanvas>Content</ReadingCanvas>);
    expect(screen.getByRole('article')).toBeDefined();
  });

  it('applies surface-reading background', () => {
    const { container } = render(<ReadingCanvas>Content</ReadingCanvas>);
    expect(container.firstElementChild?.className).toContain('bg-surface-reading');
  });

  it('applies max-width 680px to article', () => {
    render(<ReadingCanvas>Content</ReadingCanvas>);
    const article = screen.getByRole('article');
    expect(article.className).toContain('max-w-[680px]');
  });

  it('applies body-lg text size', () => {
    render(<ReadingCanvas>Content</ReadingCanvas>);
    const article = screen.getByRole('article');
    expect(article.className).toContain('text-body-lg');
  });

  it('applies text-primary color', () => {
    render(<ReadingCanvas>Content</ReadingCanvas>);
    const article = screen.getByRole('article');
    expect(article.className).toContain('text-text-primary');
  });

  it('renders topBar when provided', () => {
    render(<ReadingCanvas topBar={<span>Back to dashboard</span>}>Content</ReadingCanvas>);
    expect(screen.getByText('Back to dashboard')).toBeDefined();
  });

  it('renders topBar in a header element', () => {
    render(<ReadingCanvas topBar={<span>Nav</span>}>Content</ReadingCanvas>);
    const header = screen.getByText('Nav').closest('header');
    expect(header).not.toBeNull();
  });

  it('does not render header when no topBar', () => {
    const { container } = render(<ReadingCanvas>Content</ReadingCanvas>);
    expect(container.querySelector('header')).toBeNull();
  });

  it('applies heading styles via descendant selectors', () => {
    render(<ReadingCanvas>Content</ReadingCanvas>);
    const article = screen.getByRole('article');
    expect(article.className).toContain('[&_h1]:text-text-heading');
    expect(article.className).toContain('[&_h2]:text-text-heading');
  });

  it('applies paragraph line-height 1.7', () => {
    render(<ReadingCanvas>Content</ReadingCanvas>);
    const article = screen.getByRole('article');
    expect(article.className).toContain('[&_p]:leading-[1.7]');
  });

  it('applies paragraph spacing 1.5em', () => {
    render(<ReadingCanvas>Content</ReadingCanvas>);
    const article = screen.getByRole('article');
    expect(article.className).toContain('[&_p+p]:mt-[1.5em]');
  });

  it('merges custom className', () => {
    const { container } = render(<ReadingCanvas className="custom-canvas">Content</ReadingCanvas>);
    expect(container.firstElementChild?.className).toContain('custom-canvas');
  });
});

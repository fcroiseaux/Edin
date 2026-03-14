import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PullQuote } from './pull-quote';

describe('PullQuote', () => {
  it('renders children', () => {
    render(<PullQuote>A beautiful quote</PullQuote>);
    expect(screen.getByText('A beautiful quote')).toBeDefined();
  });

  it('renders as blockquote element', () => {
    render(<PullQuote>Quote text</PullQuote>);
    const el = screen.getByText('Quote text');
    expect(el.tagName).toBe('BLOCKQUOTE');
  });

  it('has 3px accent-primary left border', () => {
    render(<PullQuote>Quote</PullQuote>);
    const el = screen.getByText('Quote');
    expect(el.className).toContain('border-l-[3px]');
    expect(el.className).toContain('border-accent-primary');
  });

  it('applies text-heading color (blush pink)', () => {
    render(<PullQuote>Quote</PullQuote>);
    expect(screen.getByText('Quote').className).toContain('text-text-heading');
  });

  it('applies 24px font size', () => {
    render(<PullQuote>Quote</PullQuote>);
    expect(screen.getByText('Quote').className).toContain('text-[24px]');
  });

  it('applies font-light weight', () => {
    render(<PullQuote>Quote</PullQuote>);
    expect(screen.getByText('Quote').className).toContain('font-light');
  });

  it('has left padding', () => {
    render(<PullQuote>Quote</PullQuote>);
    expect(screen.getByText('Quote').className).toContain('pl-6');
  });

  it('merges custom className', () => {
    render(<PullQuote className="custom">Quote</PullQuote>);
    expect(screen.getByText('Quote').className).toContain('custom');
  });
});

import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('renders with animate-pulse and bg-surface-subtle', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain('animate-pulse');
    expect(el.className).toContain('bg-surface-subtle');
  });

  it('includes motion-reduce:animate-none for accessibility', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain('motion-reduce:animate-none');
  });

  it('renders with rounded-md', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain('rounded-md');
  });

  it('applies width and height via style', () => {
    const { container } = render(<Skeleton width={200} height={40} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.width).toBe('200px');
    expect(el.style.height).toBe('40px');
  });

  it('accepts string dimensions', () => {
    const { container } = render(<Skeleton width="100%" height="2rem" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.width).toBe('100%');
    expect(el.style.height).toBe('2rem');
  });

  it('is aria-hidden', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('merges custom className', () => {
    const { container } = render(<Skeleton className="h-8 w-full" />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain('h-8');
    expect(el.className).toContain('w-full');
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from './card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeDefined();
  });

  it('applies surface-raised background', () => {
    render(<Card>Content</Card>);
    expect(screen.getByText('Content').className).toContain('bg-surface-raised');
  });

  it('applies rounded-md border', () => {
    render(<Card>Content</Card>);
    const el = screen.getByText('Content');
    expect(el.className).toContain('rounded-md');
    expect(el.className).toContain('border-surface-subtle');
  });

  it('applies shadow-sm', () => {
    render(<Card>Content</Card>);
    expect(screen.getByText('Content').className).toContain('shadow-sm');
  });

  it('applies hover styles when hoverable', () => {
    render(<Card hoverable>Hover me</Card>);
    const el = screen.getByText('Hover me');
    expect(el.className).toContain('hover:shadow-md');
    expect(el.className).toContain('hover:border-accent-primary/30');
  });

  it('does not apply hover styles by default', () => {
    render(<Card>Static</Card>);
    expect(screen.getByText('Static').className).not.toContain('hover:shadow-md');
  });

  it('merges custom className', () => {
    render(<Card className="custom">Custom</Card>);
    expect(screen.getByText('Custom').className).toContain('custom');
  });

  it('forwards ref', () => {
    const ref = { current: null as HTMLDivElement | null };
    render(<Card ref={ref}>Ref</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

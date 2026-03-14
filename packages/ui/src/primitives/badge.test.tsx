import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge, type Domain } from './badge';

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Label</Badge>);
    expect(screen.getByText('Label')).toBeDefined();
  });

  it('applies default text color when no domain', () => {
    render(<Badge>Default</Badge>);
    expect(screen.getByText('Default').className).toContain('text-text-secondary');
  });

  it('applies domain pillar colors', () => {
    const domains: Domain[] = ['tech', 'impact', 'governance', 'finance'];
    const expected = [
      'text-pillar-tech',
      'text-pillar-impact',
      'text-pillar-governance',
      'text-pillar-finance',
    ];

    domains.forEach((domain, i) => {
      const { unmount } = render(<Badge domain={domain}>{domain}</Badge>);
      expect(screen.getByText(domain).className).toContain(expected[i]);
      unmount();
    });
  });

  it('applies filled variant with domain', () => {
    render(
      <Badge variant="filled" domain="tech">
        Tech
      </Badge>,
    );
    const el = screen.getByText('Tech');
    expect(el.className).toContain('bg-pillar-tech/8');
    expect(el.className).toContain('border-pillar-tech');
  });

  it('applies filled variant without domain', () => {
    render(<Badge variant="filled">Filled</Badge>);
    const el = screen.getByText('Filled');
    expect(el.className).toContain('bg-surface-subtle');
    expect(el.className).toContain('border-surface-subtle');
  });

  it('applies rounded-sm', () => {
    render(<Badge>Rounded</Badge>);
    expect(screen.getByText('Rounded').className).toContain('rounded-sm');
  });

  it('applies text-xs font-medium', () => {
    render(<Badge>Small</Badge>);
    const el = screen.getByText('Small');
    expect(el.className).toContain('text-xs');
    expect(el.className).toContain('font-medium');
  });

  it('merges custom className', () => {
    render(<Badge className="custom">Custom</Badge>);
    expect(screen.getByText('Custom').className).toContain('custom');
  });
});

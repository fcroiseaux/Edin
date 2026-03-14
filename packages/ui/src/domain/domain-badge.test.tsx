import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DomainBadge } from './domain-badge';
import type { Domain } from '../primitives/badge';

describe('DomainBadge', () => {
  it('renders domain name as uppercase text', () => {
    render(<DomainBadge domain="tech" />);
    expect(screen.getByText('tech')).toBeDefined();
    const el = screen.getByText('tech');
    expect(el.className).toContain('uppercase');
  });

  it('applies 11px text size', () => {
    render(<DomainBadge domain="tech" />);
    expect(screen.getByText('tech').className).toContain('text-[11px]');
  });

  it('applies font-medium', () => {
    render(<DomainBadge domain="tech" />);
    expect(screen.getByText('tech').className).toContain('font-medium');
  });

  it('applies letter-spacing 0.05em', () => {
    render(<DomainBadge domain="tech" />);
    expect(screen.getByText('tech').className).toContain('tracking-[0.05em]');
  });

  it('applies correct pillar color for each domain', () => {
    const domains: Domain[] = ['tech', 'impact', 'governance', 'finance'];
    const expected = [
      'text-pillar-tech',
      'text-pillar-impact',
      'text-pillar-governance',
      'text-pillar-finance',
    ];

    domains.forEach((domain, i) => {
      const { unmount } = render(<DomainBadge domain={domain} />);
      expect(screen.getByText(domain).className).toContain(expected[i]);
      unmount();
    });
  });

  it('applies filled variant with 8% bg and border', () => {
    render(<DomainBadge domain="tech" variant="filled" />);
    const el = screen.getByText('tech');
    expect(el.className).toContain('bg-pillar-tech/8');
    expect(el.className).toContain('border-pillar-tech');
  });

  it('has identical dimensions across all domains (text-only)', () => {
    const domains: Domain[] = ['tech', 'impact', 'governance', 'finance'];
    const classNames: string[] = [];

    domains.forEach((domain) => {
      const { unmount } = render(<DomainBadge domain={domain} />);
      const el = screen.getByText(domain);
      // Extract structural classes (exclude color-specific ones)
      const structural = el.className
        .split(' ')
        .filter((c) => !c.includes('pillar-') && !c.includes('border'))
        .join(' ');
      classNames.push(structural);
      unmount();
    });

    // All domains should have identical structural classes
    expect(new Set(classNames).size).toBe(1);
  });

  it('merges custom className', () => {
    render(<DomainBadge domain="tech" className="custom" />);
    expect(screen.getByText('tech').className).toContain('custom');
  });
});

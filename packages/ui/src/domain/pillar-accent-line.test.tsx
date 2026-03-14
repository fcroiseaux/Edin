import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PillarAccentLine } from './pillar-accent-line';
import type { Domain } from '../primitives/badge';

describe('PillarAccentLine', () => {
  it('renders a 3px wide bar', () => {
    const { container } = render(<PillarAccentLine domain="tech" />);
    const el = container.firstElementChild!;
    expect(el.className).toContain('w-[3px]');
  });

  it('spans full height of parent', () => {
    const { container } = render(<PillarAccentLine domain="tech" />);
    const el = container.firstElementChild!;
    expect(el.className).toContain('self-stretch');
  });

  it('has rounded-full ends', () => {
    const { container } = render(<PillarAccentLine domain="tech" />);
    const el = container.firstElementChild!;
    expect(el.className).toContain('rounded-full');
  });

  it('applies correct pillar color for each domain', () => {
    const domains: Domain[] = ['tech', 'impact', 'governance', 'finance'];
    const expected = [
      'bg-pillar-tech',
      'bg-pillar-impact',
      'bg-pillar-governance',
      'bg-pillar-finance',
    ];

    domains.forEach((domain, i) => {
      const { container, unmount } = render(<PillarAccentLine domain={domain} />);
      expect(container.firstElementChild!.className).toContain(expected[i]);
      unmount();
    });
  });

  it('is aria-hidden (decorative)', () => {
    const { container } = render(<PillarAccentLine domain="tech" />);
    expect(container.firstElementChild!.getAttribute('aria-hidden')).toBe('true');
  });

  it('merges custom className', () => {
    const { container } = render(<PillarAccentLine domain="tech" className="custom" />);
    expect(container.firstElementChild!.className).toContain('custom');
  });
});

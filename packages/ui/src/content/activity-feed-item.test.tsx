import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActivityFeedItem } from './activity-feed-item';

describe('ActivityFeedItem', () => {
  it('renders title', () => {
    render(<ActivityFeedItem domain="tech" title="PR merged: auth flow" />);
    expect(screen.getByText('PR merged: auth flow')).toBeDefined();
  });

  it('renders as li element', () => {
    const { container } = render(
      <ul>
        <ActivityFeedItem domain="tech" title="Title" />
      </ul>,
    );
    expect(container.querySelector('li')).not.toBeNull();
  });

  it('renders PillarAccentLine', () => {
    const { container } = render(<ActivityFeedItem domain="impact" title="Title" />);
    const accent = container.querySelector('[aria-hidden="true"]');
    expect(accent?.className).toContain('bg-pillar-impact');
  });

  it('renders DomainBadge', () => {
    render(<ActivityFeedItem domain="governance" title="Title" />);
    expect(screen.getByText('governance')).toBeDefined();
  });

  it('renders summary', () => {
    render(<ActivityFeedItem domain="tech" title="Title" summary="A brief description" />);
    expect(screen.getByText('A brief description')).toBeDefined();
  });

  it('renders contributor name', () => {
    render(<ActivityFeedItem domain="tech" title="Title" contributorName="Lena" />);
    expect(screen.getByText('Lena')).toBeDefined();
  });

  it('renders timestamp', () => {
    render(<ActivityFeedItem domain="tech" title="Title" timestamp="2h ago" />);
    expect(screen.getByText('2h ago')).toBeDefined();
  });

  it('renders title as link when titleHref provided', () => {
    render(<ActivityFeedItem domain="tech" title="My PR" titleHref="/pr/123" />);
    const link = screen.getByText('My PR').closest('a');
    expect(link?.getAttribute('href')).toBe('/pr/123');
  });

  it('uses renderLink for title link', () => {
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
    render(
      <ActivityFeedItem domain="tech" title="My PR" titleHref="/pr/123" renderLink={renderLink} />,
    );
    const link = screen.getByText('My PR').closest('a');
    expect(link?.getAttribute('data-custom')).toBe('true');
  });

  it('all domains have identical layout structure', () => {
    const domains = ['tech', 'impact', 'governance', 'finance'] as const;
    domains.forEach((domain) => {
      const { container, unmount } = render(
        <ActivityFeedItem domain={domain} title="Same" summary="Same" />,
      );
      const li = container.querySelector('li');
      expect(li?.className).toContain('flex');
      expect(li?.className).toContain('gap-3');
      unmount();
    });
  });

  it('merges custom className', () => {
    const { container } = render(
      <ActivityFeedItem domain="tech" title="Title" className="custom" />,
    );
    expect(container.querySelector('li')?.className).toContain('custom');
  });
});

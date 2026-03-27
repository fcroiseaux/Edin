import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NewspaperEditionDto } from '@edin/shared';
import { ReferenceScaleIndicator } from '../reference-scale-indicator';

const normalEdition: NewspaperEditionDto = {
  id: 'edition-1',
  editionNumber: 5,
  status: 'PUBLISHED',
  temporalSpanStart: '2026-03-20T10:00:00Z',
  temporalSpanEnd: '2026-03-22T18:00:00Z',
  eventCount: 8,
  eventDensity: 0.1429,
  significanceDistribution: { tier1: 3, tier2: 3, tier3: 2 },
  referenceScaleMetadata: {
    temporalSpanHumanReadable: 'covers 2 days of activity, Mar 20–22',
    significanceSummary: '2 collaborations, 3 communities, 3 events',
    comparisonContext: 'Above average activity — 1.8x average',
  },
  publishedAt: '2026-03-22T18:05:00Z',
  itemCount: 8,
};

const highDensityEdition: NewspaperEditionDto = {
  ...normalEdition,
  id: 'edition-high',
  eventCount: 10,
  eventDensity: 1.6667,
  referenceScaleMetadata: {
    temporalSpanHumanReadable: 'covers the last 6 hours',
    significanceSummary: '2 breakthroughs, 3 collaborations, 5 events',
    comparisonContext: 'High activity — 3.2x the 30-day average density',
  },
};

const quietEdition: NewspaperEditionDto = {
  ...normalEdition,
  id: 'edition-quiet',
  eventCount: 2,
  eventDensity: 0.012,
  referenceScaleMetadata: {
    temporalSpanHumanReadable: 'covers 7 days of activity, Mar 15–22',
    significanceSummary: '2 events',
    comparisonContext: 'Low activity period — below average density',
  },
};

describe('ReferenceScaleIndicator', () => {
  it('renders temporal span, significance breakdown, and activity level', () => {
    render(<ReferenceScaleIndicator edition={normalEdition} />);

    // Desktop view — the detail section is rendered inside hidden lg:block
    // Both mobile and desktop render the ScaleDetail, check for text presence
    expect(
      screen.getAllByText('covers 2 days of activity, Mar 20–22').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('2 collaborations, 3 communities, 3 events').length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('Above average activity — 1.8x average').length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('has the reference scale region label', () => {
    render(<ReferenceScaleIndicator edition={normalEdition} />);
    expect(screen.getByRole('region', { name: 'Reference scale' })).toBeDefined();
  });

  it('renders significance tier bars', () => {
    render(<ReferenceScaleIndicator edition={normalEdition} />);
    const breakdowns = screen.getAllByTestId('significance-breakdown');
    expect(breakdowns.length).toBeGreaterThanOrEqual(1);
  });

  it('renders mobile compact summary by default', () => {
    render(<ReferenceScaleIndicator edition={normalEdition} />);

    // The compact button should show summary text
    const toggle = screen.getByRole('button', { name: /events/ });
    expect(toggle).toBeDefined();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('expands on mobile toggle click', async () => {
    const user = userEvent.setup();
    render(<ReferenceScaleIndicator edition={normalEdition} />);

    const toggle = screen.getByRole('button', { name: /events/ });
    await user.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    const activityLevels = screen.getAllByTestId('activity-level');
    expect(activityLevels.length).toBeGreaterThanOrEqual(2); // mobile expanded + desktop
  });

  it('collapses back on second click', async () => {
    const user = userEvent.setup();
    render(<ReferenceScaleIndicator edition={normalEdition} />);

    const toggle = screen.getByRole('button', { name: /events/ });
    await user.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    await user.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('shows neutral framing for quiet period edition', () => {
    render(<ReferenceScaleIndicator edition={quietEdition} />);

    const contexts = screen.getAllByText('Low activity period — below average density');
    expect(contexts.length).toBeGreaterThanOrEqual(1);
    // Should not contain "negative" wording
    for (const el of contexts) {
      expect(el.textContent).not.toContain('bad');
      expect(el.textContent).not.toContain('poor');
    }
  });

  it('emphasizes compressed timeframe for high-density edition', () => {
    render(<ReferenceScaleIndicator edition={highDensityEdition} />);

    const temporals = screen.getAllByText('covers the last 6 hours');
    expect(temporals.length).toBeGreaterThanOrEqual(1);
    const activities = screen.getAllByText(/High activity/);
    expect(activities.length).toBeGreaterThanOrEqual(1);
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NewspaperEditionDto } from '@edin/shared';
import { EditionViewingBanner } from '../edition-viewing-banner';

const mockEdition: NewspaperEditionDto = {
  id: 'edition-3',
  editionNumber: 3,
  status: 'PUBLISHED',
  temporalSpanStart: '2026-03-10T10:00:00Z',
  temporalSpanEnd: '2026-03-12T18:00:00Z',
  eventCount: 5,
  eventDensity: 0.1,
  significanceDistribution: { '1': 2, '2': 3 },
  referenceScaleMetadata: {
    temporalSpanHumanReadable: 'covers 2 days of activity, Mar 10–12',
    significanceSummary: '2 milestones, 3 collaborations',
    comparisonContext: 'normal activity',
  },
  publishedAt: '2026-03-12T18:05:00Z',
  itemCount: 5,
};

describe('EditionViewingBanner', () => {
  it('renders edition number and temporal span', () => {
    render(<EditionViewingBanner edition={mockEdition} onBackToLatest={vi.fn()} />);

    expect(screen.getByTestId('edition-viewing-text').textContent).toContain('Edition #3');
    expect(screen.getByTestId('edition-viewing-text').textContent).toContain(
      'covers 2 days of activity, Mar 10–12',
    );
  });

  it('calls onBackToLatest when button is clicked', async () => {
    const onBackToLatest = vi.fn();
    const user = userEvent.setup();

    render(<EditionViewingBanner edition={mockEdition} onBackToLatest={onBackToLatest} />);

    await user.click(screen.getByTestId('back-to-latest'));
    expect(onBackToLatest).toHaveBeenCalledOnce();
  });

  it('has accessible role and aria-live', () => {
    render(<EditionViewingBanner edition={mockEdition} onBackToLatest={vi.fn()} />);

    expect(screen.getByRole('status')).toBeDefined();
  });
});

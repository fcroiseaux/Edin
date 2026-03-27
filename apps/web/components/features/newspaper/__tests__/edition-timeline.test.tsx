import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NewspaperEditionDto } from '@edin/shared';
import { EditionTimeline } from '../edition-timeline';

const makeEdition = (overrides: Partial<NewspaperEditionDto> = {}): NewspaperEditionDto => ({
  id: 'edition-1',
  editionNumber: 1,
  status: 'PUBLISHED',
  temporalSpanStart: '2026-03-10T10:00:00Z',
  temporalSpanEnd: '2026-03-12T18:00:00Z',
  eventCount: 5,
  eventDensity: 0.1,
  significanceDistribution: { '1': 2, '2': 3 },
  referenceScaleMetadata: {
    temporalSpanHumanReadable: 'covers 2 days',
    significanceSummary: '2 milestones, 3 collaborations',
    comparisonContext: 'normal activity',
  },
  publishedAt: '2026-03-12T18:05:00Z',
  itemCount: 5,
  ...overrides,
});

const mockEditions: NewspaperEditionDto[] = [
  makeEdition({
    id: 'edition-1',
    editionNumber: 1,
    temporalSpanStart: '2026-03-01T10:00:00Z',
    temporalSpanEnd: '2026-03-03T18:00:00Z',
    eventCount: 3,
  }),
  makeEdition({
    id: 'edition-2',
    editionNumber: 2,
    temporalSpanStart: '2026-03-05T10:00:00Z',
    temporalSpanEnd: '2026-03-07T18:00:00Z',
    eventCount: 8,
    referenceScaleMetadata: {
      temporalSpanHumanReadable: 'covers 2 days',
      significanceSummary: '3 breakthroughs',
      comparisonContext: 'high-activity edition — 3x average',
    },
  }),
  makeEdition({
    id: 'edition-3',
    editionNumber: 3,
    temporalSpanStart: '2026-03-10T10:00:00Z',
    temporalSpanEnd: '2026-03-12T18:00:00Z',
    eventCount: 15,
    referenceScaleMetadata: {
      temporalSpanHumanReadable: 'covers 2 days',
      significanceSummary: '5 events',
      comparisonContext: 'very high activity — 5x average',
    },
  }),
];

describe('EditionTimeline', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when editions list is empty', () => {
    const { container } = render(
      <EditionTimeline
        editions={[]}
        currentEditionId={null}
        latestEditionId={null}
        onEditionSelect={mockOnSelect}
      />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders edition nodes for each edition', () => {
    render(
      <EditionTimeline
        editions={mockEditions}
        currentEditionId="edition-3"
        latestEditionId="edition-3"
        onEditionSelect={mockOnSelect}
      />,
    );

    // Desktop timeline
    const desktopNav = screen.getByRole('navigation', { name: /Edition timeline/ });
    expect(desktopNav).toBeDefined();

    // Should show edition count
    expect(screen.getByText('3 editions')).toBeDefined();
  });

  it('shows LATEST label on the latest edition', () => {
    render(
      <EditionTimeline
        editions={mockEditions}
        currentEditionId="edition-3"
        latestEditionId="edition-3"
        onEditionSelect={mockOnSelect}
      />,
    );

    expect(screen.getByText('Latest')).toBeDefined();
  });

  it('calls onEditionSelect when an edition node is clicked', async () => {
    const user = userEvent.setup();
    render(
      <EditionTimeline
        editions={mockEditions}
        currentEditionId="edition-3"
        latestEditionId="edition-3"
        onEditionSelect={mockOnSelect}
      />,
    );

    // Click edition 1 node
    const edition1Btn = screen.getByRole('option', { name: /Edition 1/ });
    await user.click(edition1Btn);
    expect(mockOnSelect).toHaveBeenCalledWith('edition-1');
  });

  it('marks current edition as selected', () => {
    render(
      <EditionTimeline
        editions={mockEditions}
        currentEditionId="edition-2"
        latestEditionId="edition-3"
        onEditionSelect={mockOnSelect}
      />,
    );

    const edition2Btn = screen.getByRole('option', { name: /Edition 2/ });
    expect(edition2Btn.getAttribute('aria-selected')).toBe('true');
  });

  it('renders mobile navigation', () => {
    render(
      <EditionTimeline
        editions={mockEditions}
        currentEditionId="edition-2"
        latestEditionId="edition-3"
        onEditionSelect={mockOnSelect}
      />,
    );

    const mobileNav = screen.getByRole('navigation', { name: /Edition navigation/ });
    expect(mobileNav).toBeDefined();

    // Browse all editions button
    expect(screen.getByText(/Browse all 3 editions/)).toBeDefined();
  });

  it('mobile browse all toggles edition list', async () => {
    const user = userEvent.setup();
    render(
      <EditionTimeline
        editions={mockEditions}
        currentEditionId="edition-2"
        latestEditionId="edition-3"
        onEditionSelect={mockOnSelect}
      />,
    );

    const browseBtn = screen.getByText(/Browse all 3 editions/);
    await user.click(browseBtn);

    // All editions listed
    expect(screen.getByRole('listbox', { name: /All editions/ })).toBeDefined();
  });

  it('shows loading state', () => {
    render(
      <EditionTimeline
        editions={mockEditions}
        currentEditionId="edition-3"
        latestEditionId="edition-3"
        onEditionSelect={mockOnSelect}
        isLoading
      />,
    );

    expect(screen.getByText('Loading...')).toBeDefined();
  });
});

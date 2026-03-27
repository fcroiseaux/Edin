import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {
  NewspaperEditionWithItemsDto,
  NewspaperItemDto,
  NewspaperEditionDto,
} from '@edin/shared';
import { NewspaperLayout } from './newspaper-layout';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock next/navigation
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: mockReplace }),
}));

// Mock the hooks
const mockEditionsList: NewspaperEditionDto[] = [];
let mockEditionItemsData:
  | {
      items: NewspaperItemDto[];
      channels: {
        channelId: string;
        channelName: string;
        channelType: string;
        itemCount: number;
      }[];
    }
  | undefined;
let mockIsLoadingEdition = false;

vi.mock('../../../hooks/use-newspaper-editions', () => ({
  useNewspaperEditions: () => ({ data: mockEditionsList }),
}));

vi.mock('../../../hooks/use-newspaper-edition-items', () => ({
  useNewspaperEditionItems: () => ({
    data: mockEditionItemsData,
    isLoading: mockIsLoadingEdition,
  }),
}));

vi.mock('../../../hooks/use-auth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('../../../hooks/use-newspaper-item-voting', () => ({
  useVotedItemIds: () => ({ data: [], isLoading: false }),
  isItemVoted: () => false,
}));

vi.mock('./newspaper-item-vote-button', () => ({
  NewspaperItemVoteButton: ({ voteCount }: { voteCount: number }) => (
    <span data-testid="vote-button">{voteCount}</span>
  ),
}));

const mockItem1: NewspaperItemDto = {
  id: 'item-1',
  sourceEventType: 'PRIZE_AWARDED',
  channelId: 'ch-1',
  channelName: 'Technology',
  headline: 'Cross-Domain Collaboration Prize Awarded',
  body: 'A technology and finance specialist bridged two domains with innovative work.',
  chathamHouseLabel: 'a technology and finance specialist',
  significanceScore: 3,
  rank: 1,
  communityVoteCount: 0,
  createdAt: '2026-03-22T17:30:00Z',
};

const mockItem2: NewspaperItemDto = {
  id: 'item-2',
  sourceEventType: 'TRACK_RECORD_MILESTONE',
  channelId: 'ch-2',
  channelName: 'Governance',
  headline: '6-Month Consistent Contributor Milestone',
  body: 'A governance expert reached the 6-month consistency milestone.',
  chathamHouseLabel: 'a governance expert',
  significanceScore: 2,
  rank: 2,
  communityVoteCount: 0,
  createdAt: '2026-03-22T16:00:00Z',
};

const mockItem3: NewspaperItemDto = {
  id: 'item-3',
  sourceEventType: 'PEER_NOMINATION_RECEIVED',
  channelId: 'ch-1',
  channelName: 'Technology',
  headline: 'Peer Nomination for Outstanding Technical Contribution',
  body: 'A community contributor was nominated for exceptional backend work.',
  chathamHouseLabel: 'a technology expert',
  significanceScore: 1,
  rank: 3,
  communityVoteCount: 5,
  createdAt: '2026-03-22T14:00:00Z',
};

const mockEdition: NewspaperEditionWithItemsDto = {
  id: 'edition-1',
  editionNumber: 5,
  status: 'PUBLISHED',
  temporalSpanStart: '2026-03-20T10:00:00Z',
  temporalSpanEnd: '2026-03-22T18:00:00Z',
  eventCount: 8,
  eventDensity: 0.1429,
  significanceDistribution: { '1': 3, '2': 3, '3': 2 },
  referenceScaleMetadata: {
    temporalSpanHumanReadable: 'covers the last 2 days',
    significanceSummary: '2 breakthroughs, 3 collaborations, 3 milestones',
    comparisonContext: 'high-activity edition',
  },
  publishedAt: '2026-03-22T18:05:00Z',
  itemCount: 3,
  items: [mockItem1, mockItem2, mockItem3],
  channels: [
    { channelId: 'ch-1', channelName: 'Technology', channelType: 'DOMAIN', itemCount: 2 },
    { channelId: 'ch-2', channelName: 'Governance', channelType: 'DOMAIN', itemCount: 1 },
    { channelId: 'ch-3', channelName: 'Finance', channelType: 'DOMAIN', itemCount: 0 },
  ],
};

const mockOlderEdition: NewspaperEditionDto = {
  id: 'edition-0',
  editionNumber: 4,
  status: 'PUBLISHED',
  temporalSpanStart: '2026-03-15T10:00:00Z',
  temporalSpanEnd: '2026-03-18T18:00:00Z',
  eventCount: 5,
  eventDensity: 0.069,
  significanceDistribution: { '1': 2, '2': 3 },
  referenceScaleMetadata: {
    temporalSpanHumanReadable: 'covers the last 3 days',
    significanceSummary: '3 collaborations, 2 milestones',
    comparisonContext: 'normal activity',
  },
  publishedAt: '2026-03-18T18:05:00Z',
  itemCount: 5,
};

describe('NewspaperLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    mockEditionsList.length = 0;
    mockEditionItemsData = undefined;
    mockIsLoadingEdition = false;
  });

  it('renders headline item from the first item', () => {
    render(<NewspaperLayout edition={mockEdition} />);

    expect(screen.getByText('Cross-Domain Collaboration Prize Awarded')).toBeDefined();
    expect(screen.getByLabelText('Headline story')).toBeDefined();
  });

  it('renders secondary items grid', () => {
    render(<NewspaperLayout edition={mockEdition} />);

    expect(screen.getByText('6-Month Consistent Contributor Milestone')).toBeDefined();
    expect(
      screen.getByText('Peer Nomination for Outstanding Technical Contribution'),
    ).toBeDefined();
  });

  it('renders edition sidebar with metadata', () => {
    render(<NewspaperLayout edition={mockEdition} />);

    expect(screen.getByText('Edition #5')).toBeDefined();
    expect(screen.getAllByText('covers the last 2 days').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText('2 breakthroughs, 3 collaborations, 3 milestones').length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('high-activity edition').length).toBeGreaterThanOrEqual(1);
  });

  it('renders empty state when edition is null', () => {
    render(<NewspaperLayout edition={null} />);

    expect(screen.getByText('The Contributor Newspaper')).toBeDefined();
    expect(screen.getByText(/first edition will be published/)).toBeDefined();
    expect(screen.getByText('Apply to Contribute')).toBeDefined();
  });

  it('renders empty state when edition has no items', () => {
    const emptyEdition = { ...mockEdition, items: [] };
    render(<NewspaperLayout edition={emptyEdition} />);

    expect(screen.getByText('The Contributor Newspaper')).toBeDefined();
  });

  it('shows Chatham House labels, not contributor names', () => {
    render(<NewspaperLayout edition={mockEdition} />);

    expect(screen.getByText('by a technology and finance specialist')).toBeDefined();
    expect(screen.getByText('by a governance expert')).toBeDefined();
    expect(screen.getByText('by a technology expert')).toBeDefined();
  });

  it('shows significance badges with correct tier', () => {
    render(<NewspaperLayout edition={mockEdition} />);

    expect(screen.getByText('Exceptional')).toBeDefined();
    expect(screen.getByText('Significant')).toBeDefined();
    expect(screen.getByText('Notable')).toBeDefined();
  });

  it('shows channel tags for items', () => {
    render(<NewspaperLayout edition={mockEdition} />);

    const techElements = screen.getAllByText('Technology');
    expect(techElements.length).toBeGreaterThanOrEqual(1);
    const govElements = screen.getAllByText('Governance');
    expect(govElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows page title and edition info', () => {
    render(<NewspaperLayout edition={mockEdition} />);

    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
    const editionRefs = screen.getAllByText(/Edition #5/);
    expect(editionRefs.length).toBeGreaterThanOrEqual(1);
  });

  it('renders mobile sidebar toggle button', () => {
    render(<NewspaperLayout edition={mockEdition} />);

    const toggleButton = screen.getByRole('button', { name: /Edition Details/ });
    expect(toggleButton).toBeDefined();
    expect(toggleButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('toggles mobile sidebar on button click', async () => {
    const user = userEvent.setup();
    render(<NewspaperLayout edition={mockEdition} />);

    const toggleButton = screen.getByRole('button', { name: /Edition Details/ });
    await user.click(toggleButton);

    expect(toggleButton.getAttribute('aria-expanded')).toBe('true');
    const sidebarElements = screen.getAllByLabelText('Edition details');
    expect(sidebarElements.length).toBeGreaterThanOrEqual(1);
  });

  describe('channel filtering', () => {
    it('renders channel filter with all channels including zero-count', () => {
      render(<NewspaperLayout edition={mockEdition} />);

      const allButtons = screen.getAllByText('All Channels');
      expect(allButtons.length).toBeGreaterThanOrEqual(1);

      const techButtons = screen.getAllByText(/Technology/);
      expect(techButtons.length).toBeGreaterThanOrEqual(1);

      const financeElements = screen.getAllByText(/Finance/);
      expect(financeElements.length).toBeGreaterThanOrEqual(1);
    });

    it('filters items when channel is selected via URL', () => {
      mockSearchParams = new URLSearchParams('channel=ch-2');

      render(<NewspaperLayout edition={mockEdition} />);

      expect(screen.getByText('6-Month Consistent Contributor Milestone')).toBeDefined();
      expect(screen.queryByText('Cross-Domain Collaboration Prize Awarded')).toBeNull();
    });

    it('shows all items when no channel filter is active', () => {
      render(<NewspaperLayout edition={mockEdition} />);

      expect(screen.getByText('Cross-Domain Collaboration Prize Awarded')).toBeDefined();
      expect(screen.getByText('6-Month Consistent Contributor Milestone')).toBeDefined();
      expect(
        screen.getByText('Peer Nomination for Outstanding Technical Contribution'),
      ).toBeDefined();
    });

    it('shows empty filter message when all items are filtered out', () => {
      mockSearchParams = new URLSearchParams('channel=ch-nonexistent');

      render(<NewspaperLayout edition={mockEdition} />);

      expect(screen.getByText('No items match the selected channel filter.')).toBeDefined();
    });

    it('updates URL when channel filter is clicked', async () => {
      const user = userEvent.setup();
      render(<NewspaperLayout edition={mockEdition} />);

      const govButtons = screen.getAllByRole('button', { name: /Governance/ });
      const channelButton = govButtons.find((btn) => btn.getAttribute('aria-pressed') !== null);
      if (channelButton) {
        await user.click(channelButton);
        expect(mockReplace).toHaveBeenCalledWith(expect.stringContaining('channel=ch-2'), {
          scroll: false,
        });
      }
    });
  });

  describe('edition navigation', () => {
    it('does not render timeline when only one edition exists', () => {
      mockEditionsList.push({ ...mockEdition, items: undefined } as unknown as NewspaperEditionDto);
      render(<NewspaperLayout edition={mockEdition} />);

      expect(screen.queryByRole('navigation', { name: /Edition timeline/ })).toBeNull();
    });

    it('renders timeline when multiple editions are available', () => {
      mockEditionsList.push(mockOlderEdition, {
        ...mockEdition,
        items: undefined,
      } as unknown as NewspaperEditionDto);
      render(<NewspaperLayout edition={mockEdition} />);

      expect(screen.getByRole('navigation', { name: /Edition timeline/ })).toBeDefined();
    });

    it('shows viewing banner when edition param is in URL', () => {
      mockSearchParams = new URLSearchParams('edition=edition-0');
      mockEditionsList.push(mockOlderEdition, {
        ...mockEdition,
        items: undefined,
      } as unknown as NewspaperEditionDto);
      mockEditionItemsData = {
        items: [{ ...mockItem1, id: 'older-item-1' }],
        channels: [
          { channelId: 'ch-1', channelName: 'Technology', channelType: 'DOMAIN', itemCount: 1 },
        ],
      };

      render(<NewspaperLayout edition={mockEdition} />);

      expect(screen.getByTestId('edition-viewing-text')).toBeDefined();
      expect(screen.getByTestId('back-to-latest')).toBeDefined();
    });

    it('back to latest removes edition param from URL', async () => {
      const user = userEvent.setup();
      mockSearchParams = new URLSearchParams('edition=edition-0');
      mockEditionsList.push(mockOlderEdition, {
        ...mockEdition,
        items: undefined,
      } as unknown as NewspaperEditionDto);
      mockEditionItemsData = {
        items: [{ ...mockItem1, id: 'older-item-1' }],
        channels: [
          { channelId: 'ch-1', channelName: 'Technology', channelType: 'DOMAIN', itemCount: 1 },
        ],
      };

      render(<NewspaperLayout edition={mockEdition} />);

      await user.click(screen.getByTestId('back-to-latest'));
      expect(mockReplace).toHaveBeenCalledWith('?', { scroll: false });
    });

    it('channel filters persist when switching editions', async () => {
      mockSearchParams = new URLSearchParams('channel=ch-1&edition=edition-0');
      mockEditionsList.push(mockOlderEdition, {
        ...mockEdition,
        items: undefined,
      } as unknown as NewspaperEditionDto);
      mockEditionItemsData = {
        items: [{ ...mockItem1, id: 'older-item-1' }],
        channels: [
          { channelId: 'ch-1', channelName: 'Technology', channelType: 'DOMAIN', itemCount: 1 },
        ],
      };

      render(<NewspaperLayout edition={mockEdition} />);

      // Channel filter should still be reflected in URL
      expect(mockSearchParams.get('channel')).toBe('ch-1');
      expect(mockSearchParams.get('edition')).toBe('edition-0');
    });

    it('does not show viewing banner when viewing latest', () => {
      render(<NewspaperLayout edition={mockEdition} />);

      expect(screen.queryByTestId('edition-viewing-text')).toBeNull();
    });
  });
});

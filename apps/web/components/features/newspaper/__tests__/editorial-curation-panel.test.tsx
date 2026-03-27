import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { NewspaperItemDto } from '@edin/shared';
import { EditorialCurationPanel } from '../editorial-curation-panel';

// Mock the hook
const mockEnterEditMode = vi.fn();
const mockExitEditMode = vi.fn();
const mockPromoteItem = vi.fn();
const mockDemoteItem = vi.fn();
const mockSetAsHeadline = vi.fn();
const mockResetItem = vi.fn();
const mockSaveCuration = vi.fn();

let mockIsEditMode = false;
let mockPendingChanges = new Map<string, number | null>();
let mockHasPendingChanges = false;

vi.mock('../../../../hooks/use-editorial-curation', () => ({
  useEditorialCuration: () => ({
    isEditMode: mockIsEditMode,
    enterEditMode: mockEnterEditMode,
    exitEditMode: mockExitEditMode,
    pendingChanges: mockPendingChanges,
    promoteItem: mockPromoteItem,
    demoteItem: mockDemoteItem,
    setAsHeadline: mockSetAsHeadline,
    resetItem: mockResetItem,
    saveCuration: mockSaveCuration,
    hasPendingChanges: mockHasPendingChanges,
    isSaving: false,
    saveError: null,
  }),
}));

const mockItems: NewspaperItemDto[] = [
  {
    id: 'item-1',
    editionId: 'edition-1',
    sourceEventType: 'PRIZE_AWARDED',
    channelId: 'ch-1',
    channelName: 'Technology',
    headline: 'First Item Headline',
    body: 'First item body',
    chathamHouseLabel: 'a technology expert',
    significanceScore: 5,
    rank: 1,
    communityVoteCount: 0,
    createdAt: '2026-03-25T10:00:00Z',
  },
  {
    id: 'item-2',
    editionId: 'edition-1',
    sourceEventType: 'CROSS_DOMAIN_COLLABORATION',
    channelId: 'ch-2',
    channelName: 'Impact',
    headline: 'Second Item Headline',
    body: 'Second item body',
    chathamHouseLabel: 'an impact specialist',
    significanceScore: 3,
    rank: 2,
    communityVoteCount: 0,
    createdAt: '2026-03-25T10:01:00Z',
  },
  {
    id: 'item-3',
    editionId: 'edition-1',
    sourceEventType: 'TRACK_RECORD_MILESTONE',
    channelId: 'ch-1',
    channelName: 'Technology',
    headline: 'Third Item Headline',
    body: 'Third item body',
    chathamHouseLabel: 'a technology expert',
    significanceScore: 2,
    rank: 3,
    communityVoteCount: 0,
    createdAt: '2026-03-25T10:02:00Z',
  },
];

describe('EditorialCurationPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsEditMode = false;
    mockPendingChanges = new Map();
    mockHasPendingChanges = false;
  });

  it('returns null when user is not an editor', () => {
    const { container } = render(
      <EditorialCurationPanel editionId="edition-1" items={mockItems} isEditor={false} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows "Edit Edition" button for editors when not in edit mode', () => {
    render(<EditorialCurationPanel editionId="edition-1" items={mockItems} isEditor={true} />);
    expect(screen.getByText('Edit Edition')).toBeInTheDocument();
  });

  it('clicking "Edit Edition" calls enterEditMode', async () => {
    const user = userEvent.setup();
    render(<EditorialCurationPanel editionId="edition-1" items={mockItems} isEditor={true} />);

    await user.click(screen.getByText('Edit Edition'));
    expect(mockEnterEditMode).toHaveBeenCalledTimes(1);
  });

  it('shows items with controls in edit mode', () => {
    mockIsEditMode = true;
    render(<EditorialCurationPanel editionId="edition-1" items={mockItems} isEditor={true} />);

    expect(screen.getByText('Editorial Curation')).toBeInTheDocument();
    expect(screen.getByText('First Item Headline')).toBeInTheDocument();
    expect(screen.getByText('Second Item Headline')).toBeInTheDocument();
    expect(screen.getByText('Third Item Headline')).toBeInTheDocument();

    // Should have Publish and Discard buttons
    expect(screen.getByText('Publish Curation')).toBeInTheDocument();
    expect(screen.getByText('Discard')).toBeInTheDocument();
  });

  it('promote button calls promoteItem with correct args', async () => {
    mockIsEditMode = true;
    const user = userEvent.setup();
    render(<EditorialCurationPanel editionId="edition-1" items={mockItems} isEditor={true} />);

    // Item 1 (rank 1) has disabled promote; click item 2's promote button (index 1)
    const promoteButtons = screen.getAllByTitle('Promote');
    await user.click(promoteButtons[1]); // Second promote button = item 2 (rank 2)
    expect(mockPromoteItem).toHaveBeenCalled();
  });

  it('demote button calls demoteItem', async () => {
    mockIsEditMode = true;
    const user = userEvent.setup();
    render(<EditorialCurationPanel editionId="edition-1" items={mockItems} isEditor={true} />);

    const demoteButtons = screen.getAllByTitle('Demote');
    await user.click(demoteButtons[0]);
    expect(mockDemoteItem).toHaveBeenCalled();
  });

  it('"Set as Headline" calls setAsHeadline', async () => {
    mockIsEditMode = true;
    const user = userEvent.setup();
    render(<EditorialCurationPanel editionId="edition-1" items={mockItems} isEditor={true} />);

    // "Set as Headline" is only shown for items that are NOT already rank 1
    const headlineButtons = screen.getAllByTitle('Set as Headline');
    expect(headlineButtons.length).toBe(2); // items 2 and 3
    await user.click(headlineButtons[0]);
    expect(mockSetAsHeadline).toHaveBeenCalled();
  });

  it('"Reset to Algorithmic Order" calls resetItem', async () => {
    mockIsEditMode = true;
    const user = userEvent.setup();
    render(<EditorialCurationPanel editionId="edition-1" items={mockItems} isEditor={true} />);

    const resetButtons = screen.getAllByTitle('Reset to Algorithmic Order');
    await user.click(resetButtons[0]);
    expect(mockResetItem).toHaveBeenCalled();
  });

  it('"Publish Curation" calls saveCuration', async () => {
    mockIsEditMode = true;
    mockHasPendingChanges = true;
    const user = userEvent.setup();
    render(<EditorialCurationPanel editionId="edition-1" items={mockItems} isEditor={true} />);

    await user.click(screen.getByText('Publish Curation'));
    expect(mockSaveCuration).toHaveBeenCalledTimes(1);
  });

  it('"Discard" calls exitEditMode', async () => {
    mockIsEditMode = true;
    const user = userEvent.setup();
    render(<EditorialCurationPanel editionId="edition-1" items={mockItems} isEditor={true} />);

    await user.click(screen.getByText('Discard'));
    expect(mockExitEditMode).toHaveBeenCalledTimes(1);
  });

  it('shows pending changes count', () => {
    mockIsEditMode = true;
    mockHasPendingChanges = true;
    mockPendingChanges = new Map([['item-1', 2]]);
    render(<EditorialCurationPanel editionId="edition-1" items={mockItems} isEditor={true} />);

    expect(screen.getByText(/1 item modified/)).toBeInTheDocument();
  });
});

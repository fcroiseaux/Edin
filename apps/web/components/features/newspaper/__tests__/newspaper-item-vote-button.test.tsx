import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewspaperItemVoteButton } from '../newspaper-item-vote-button';

// Mock the voting hook
const mockMutateAsync = vi.fn();
let mockIsPending = false;

vi.mock('../../../../hooks/use-newspaper-item-voting', () => ({
  useCastItemVote: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockIsPending,
  }),
}));

describe('NewspaperItemVoteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending = false;
    mockMutateAsync.mockResolvedValue({
      voteId: 'v1',
      newspaperItemId: 'item-1',
      currentVoteCount: 6,
    });
  });

  it('renders vote button with count for authenticated users', () => {
    render(
      <NewspaperItemVoteButton
        itemId="item-1"
        voteCount={5}
        hasVoted={false}
        isAuthenticated={true}
      />,
    );

    expect(screen.getByRole('button', { name: 'Vote for this item' })).toBeInTheDocument();
    expect(screen.getByText('Vote')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders "Voted" indicator when hasVoted is true', () => {
    render(
      <NewspaperItemVoteButton
        itemId="item-1"
        voteCount={5}
        hasVoted={true}
        isAuthenticated={true}
      />,
    );

    expect(screen.getByText('Voted')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Vote for this item' })).not.toBeInTheDocument();
  });

  it('renders only count for unauthenticated users (no button)', () => {
    render(
      <NewspaperItemVoteButton
        itemId="item-1"
        voteCount={5}
        hasVoted={false}
        isAuthenticated={false}
      />,
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText('Vote')).not.toBeInTheDocument();
  });

  it('triggers mutation when vote button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <NewspaperItemVoteButton
        itemId="item-1"
        voteCount={5}
        hasVoted={false}
        isAuthenticated={true}
      />,
    );

    const button = screen.getByRole('button', { name: 'Vote for this item' });
    await user.click(button);

    expect(mockMutateAsync).toHaveBeenCalledWith('item-1');
  });

  it('shows optimistic update after clicking vote', async () => {
    const user = userEvent.setup();

    render(
      <NewspaperItemVoteButton
        itemId="item-1"
        voteCount={5}
        hasVoted={false}
        isAuthenticated={true}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Vote for this item' }));

    // After optimistic update, should show Voted indicator with incremented count
    expect(screen.getByText('Voted')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('button is disabled when disabled prop is true', () => {
    render(
      <NewspaperItemVoteButton
        itemId="item-1"
        voteCount={5}
        hasVoted={false}
        isAuthenticated={true}
        disabled={true}
      />,
    );

    const button = screen.getByRole('button', { name: 'Vote for this item' });
    expect(button).toBeDisabled();
  });
});

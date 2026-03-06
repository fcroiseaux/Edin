import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ContributionList } from './contribution-list';
import { ContributionListItem } from './contribution-list-item';
import type { ContributionWithRepository } from '@edin/shared';

const mockContribution: ContributionWithRepository = {
  id: 'contrib-1',
  contributorId: 'user-1',
  repositoryId: 'repo-1',
  repositoryName: 'org/my-repo',
  source: 'GITHUB',
  sourceRef: 'abc123',
  contributionType: 'COMMIT',
  title: 'feat: add new feature',
  description: 'Description of the commit',
  rawData: {},
  normalizedAt: '2026-03-05T10:00:00Z',
  status: 'ATTRIBUTED',
  createdAt: '2026-03-05T10:00:00Z',
  updatedAt: '2026-03-05T10:00:00Z',
};

const mockPr: ContributionWithRepository = {
  ...mockContribution,
  id: 'contrib-2',
  contributionType: 'PULL_REQUEST',
  title: 'Add authentication module',
  status: 'EVALUATED',
};

const mockReview: ContributionWithRepository = {
  ...mockContribution,
  id: 'contrib-3',
  contributionType: 'CODE_REVIEW',
  title: 'Review on PR #42: approved',
  status: 'INGESTED',
};

describe('ContributionListItem', () => {
  it('renders contribution with title, repo name, and status', () => {
    const onSelect = vi.fn();
    render(<ContributionListItem contribution={mockContribution} onSelect={onSelect} />);

    expect(screen.getByText('feat: add new feature')).toBeInTheDocument();
    expect(screen.getByText('org/my-repo')).toBeInTheDocument();
    expect(screen.getByText('Awaiting evaluation')).toBeInTheDocument();
  });

  it('shows "Evaluated" badge for evaluated contributions', () => {
    const onSelect = vi.fn();
    render(<ContributionListItem contribution={mockPr} onSelect={onSelect} />);

    expect(screen.getByText('Evaluated')).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    render(<ContributionListItem contribution={mockContribution} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('contrib-1');
  });

  it('has correct aria-label for accessibility', () => {
    const onSelect = vi.fn();
    render(<ContributionListItem contribution={mockContribution} onSelect={onSelect} />);

    expect(screen.getByLabelText('Commit: feat: add new feature')).toBeInTheDocument();
  });
});

describe('ContributionList', () => {
  const defaultProps = {
    contributions: [mockContribution, mockPr, mockReview],
    isLoading: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    onLoadMore: vi.fn(),
    onSelectContribution: vi.fn(),
  };

  it('renders list of contributions', () => {
    render(<ContributionList {...defaultProps} />);

    expect(screen.getByText('feat: add new feature')).toBeInTheDocument();
    expect(screen.getByText('Add authentication module')).toBeInTheDocument();
    expect(screen.getByText('Review on PR #42: approved')).toBeInTheDocument();
  });

  it('shows empty state when no contributions', () => {
    render(<ContributionList {...defaultProps} contributions={[]} />);

    expect(screen.getByText('No contributions yet')).toBeInTheDocument();
  });

  it('shows skeleton loader when loading', () => {
    render(<ContributionList {...defaultProps} isLoading={true} />);

    expect(screen.getByLabelText('Loading contributions')).toBeInTheDocument();
  });

  it('shows Load more button when hasNextPage is true', () => {
    render(<ContributionList {...defaultProps} hasNextPage={true} />);

    expect(screen.getByText('Load more')).toBeInTheDocument();
  });

  it('hides Load more button when hasNextPage is false', () => {
    render(<ContributionList {...defaultProps} hasNextPage={false} />);

    expect(screen.queryByText('Load more')).not.toBeInTheDocument();
  });

  it('calls onLoadMore when Load more is clicked', () => {
    const onLoadMore = vi.fn();
    render(<ContributionList {...defaultProps} hasNextPage={true} onLoadMore={onLoadMore} />);

    fireEvent.click(screen.getByText('Load more'));
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('shows Loading... text when fetching next page', () => {
    render(<ContributionList {...defaultProps} hasNextPage={true} isFetchingNextPage={true} />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders all contribution types with equal visual prominence', () => {
    render(<ContributionList {...defaultProps} />);

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(3);

    // All items should have the same button styling (equal prominence)
    const buttons = screen.getAllByRole('button');
    const buttonClasses = buttons.map((btn) => btn.className);
    // All should share the same base class pattern
    buttonClasses.forEach((cls) => {
      expect(cls).toContain('rounded-[var(--radius-md)]');
    });
  });
});

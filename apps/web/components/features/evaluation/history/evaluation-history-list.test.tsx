import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EvaluationHistoryItemDto } from '@edin/shared';
import { EvaluationHistoryList } from './evaluation-history-list';

describe('EvaluationHistoryList', () => {
  const items: EvaluationHistoryItemDto[] = [
    {
      id: 'eval-1',
      compositeScore: 82,
      contributionType: 'COMMIT',
      contributionTitle: 'Refactor auth module',
      narrativePreview: 'Your refactoring improved clarity.',
      completedAt: '2026-03-01T12:00:00.000Z',
    },
    {
      id: 'eval-2',
      compositeScore: 45,
      contributionType: 'DOCUMENTATION',
      contributionTitle: 'Update README',
      narrativePreview: 'Documentation covers basic setup.',
      completedAt: '2026-02-20T12:00:00.000Z',
    },
  ];

  const defaultProps = {
    items,
    hasMore: false,
    isFetchingMore: false,
    onLoadMore: vi.fn(),
  };

  it('renders evaluation cards with contribution titles', () => {
    render(<EvaluationHistoryList {...defaultProps} />);

    expect(screen.getByText('Refactor auth module')).toBeInTheDocument();
    expect(screen.getByText('Update README')).toBeInTheDocument();
  });

  it('shows narrative preview', () => {
    render(<EvaluationHistoryList {...defaultProps} />);

    expect(screen.getByText('Your refactoring improved clarity.')).toBeInTheDocument();
  });

  it('displays descriptive score labels', () => {
    render(<EvaluationHistoryList {...defaultProps} />);

    expect(screen.getByText('Exceptional')).toBeInTheDocument();
    expect(screen.getByText('Solid')).toBeInTheDocument();
  });

  it('shows type badges', () => {
    render(<EvaluationHistoryList {...defaultProps} />);

    expect(screen.getByText('Commit')).toBeInTheDocument();
    expect(screen.getByText('Doc')).toBeInTheDocument();
  });

  it('links to detail page', () => {
    render(<EvaluationHistoryList {...defaultProps} />);

    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/dashboard/evaluations/eval-1');
    expect(links[1]).toHaveAttribute('href', '/dashboard/evaluations/eval-2');
  });

  it('shows load more button when hasMore is true', async () => {
    const onLoadMore = vi.fn();
    const user = userEvent.setup();

    render(<EvaluationHistoryList {...defaultProps} hasMore={true} onLoadMore={onLoadMore} />);

    const button = screen.getByText('Load more evaluations');
    await user.click(button);
    expect(onLoadMore).toHaveBeenCalled();
  });

  it('shows empty state message', () => {
    render(<EvaluationHistoryList {...defaultProps} items={[]} />);

    expect(screen.getByText('No evaluations found for the selected filters.')).toBeInTheDocument();
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReviewQueueTable } from './review-queue-table';
import type { EvaluationReviewQueueItemDto } from '@edin/shared';

const mockItems: EvaluationReviewQueueItemDto[] = [
  {
    id: 'review-1',
    evaluationId: 'eval-1',
    contributorName: 'Alice',
    contributionTitle: 'Fix auth flow',
    domain: 'TECHNOLOGY',
    originalScore: 72,
    flagReason: 'The complexity dimension does not accurately capture the refactoring effort',
    flaggedAt: new Date(Date.now() - 3_600_000).toISOString(), // 1h ago
    status: 'PENDING',
  },
  {
    id: 'review-2',
    evaluationId: 'eval-2',
    contributorName: 'Bob',
    contributionTitle: 'Add payment module',
    domain: 'FINTECH',
    originalScore: 85,
    flagReason: 'Test coverage was actually higher than scored',
    flaggedAt: new Date(Date.now() - 86_400_000 * 2).toISOString(), // 2d ago
    status: 'CONFIRMED',
  },
];

describe('ReviewQueueTable', () => {
  it('renders table rows with contributor data', () => {
    render(<ReviewQueueTable items={mockItems} isLoading={false} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Fix auth flow')).toBeInTheDocument();
    expect(screen.getByText('Add payment module')).toBeInTheDocument();
  });

  it('shows domain and score columns', () => {
    render(<ReviewQueueTable items={mockItems} isLoading={false} />);

    expect(screen.getByText('TECHNOLOGY')).toBeInTheDocument();
    expect(screen.getByText('FINTECH')).toBeInTheDocument();
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument();
  });

  it('shows status badges', () => {
    render(<ReviewQueueTable items={mockItems} isLoading={false} />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
  });

  it('shows relative time', () => {
    render(<ReviewQueueTable items={mockItems} isLoading={false} />);

    expect(screen.getByText('1h ago')).toBeInTheDocument();
    expect(screen.getByText('2d ago')).toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    render(<ReviewQueueTable items={[]} isLoading={false} />);

    expect(screen.getByText('No flagged evaluations in the review queue.')).toBeInTheDocument();
  });

  it('shows loading skeleton', () => {
    const { container } = render(<ReviewQueueTable items={[]} isLoading={true} />);

    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { EvaluationHistoryItemDto } from '@edin/shared';

// Mock recharts to avoid canvas issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

import { EvaluationTimeline } from './evaluation-timeline';

describe('EvaluationTimeline', () => {
  const items: EvaluationHistoryItemDto[] = [
    {
      id: 'eval-1',
      compositeScore: 82,
      contributionType: 'COMMIT',
      contributionTitle: 'Refactor auth',
      narrativePreview: 'Your refactoring improved clarity.',
      completedAt: '2026-03-01T12:00:00.000Z',
    },
    {
      id: 'eval-2',
      compositeScore: 75,
      contributionType: 'PULL_REQUEST',
      contributionTitle: 'Add tests',
      narrativePreview: 'Good test coverage added.',
      completedAt: '2026-02-15T12:00:00.000Z',
    },
  ];

  it('renders chart container', () => {
    render(<EvaluationTimeline items={items} />);

    expect(screen.getByTestId('responsive-container')).toBeInTheDocument();
  });

  it('renders accessible data table with evaluation data', () => {
    render(<EvaluationTimeline items={items} />);

    const table = screen.getByRole('table', { name: 'Evaluation score history' });
    expect(table).toBeInTheDocument();

    expect(screen.getByText('Refactor auth')).toBeInTheDocument();
    expect(screen.getByText('Add tests')).toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    render(<EvaluationTimeline items={[]} />);

    expect(screen.getByText('No completed evaluations to display yet.')).toBeInTheDocument();
  });
});

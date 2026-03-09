import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { EvaluationMetricsSection } from './evaluation-metrics-section';
import type { PublicEvaluationAggregateDto } from '@edin/shared';

// Mock Recharts to avoid SSR issues in tests
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  Cell: () => null,
}));

const mockMetrics: PublicEvaluationAggregateDto = {
  totalEvaluations: 42,
  averageScore: 67.5,
  byDomain: [
    { domain: 'Technology', averageScore: 72.3, count: 20 },
    { domain: 'Fintech', averageScore: 63.1, count: 12 },
  ],
  scoreDistribution: [
    { range: '0–20', min: 0, max: 20, count: 2 },
    { range: '21–40', min: 21, max: 40, count: 5 },
    { range: '41–60', min: 41, max: 60, count: 12 },
    { range: '61–80', min: 61, max: 80, count: 18 },
    { range: '81–100', min: 81, max: 100, count: 5 },
  ],
  agreementRate: { overall: 78, totalReviewed: 9 },
};

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('EvaluationMetricsSection', () => {
  it('renders section heading and key metrics', () => {
    renderWithQueryClient(<EvaluationMetricsSection initialData={mockMetrics} />);

    expect(screen.getByText('Evaluation Intelligence')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('67.5')).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();
  });

  it('renders domain scores with domain names', () => {
    renderWithQueryClient(<EvaluationMetricsSection initialData={mockMetrics} />);

    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('72.3')).toBeInTheDocument();
    expect(screen.getByText('Fintech')).toBeInTheDocument();
    expect(screen.getByText('63.1')).toBeInTheDocument();
  });

  it('renders nothing when totalEvaluations is 0', () => {
    const emptyMetrics = { ...mockMetrics, totalEvaluations: 0 };
    const { container } = renderWithQueryClient(
      <EvaluationMetricsSection initialData={emptyMetrics} />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('shows N/A for agreement rate when no reviews', () => {
    const noReviews = {
      ...mockMetrics,
      agreementRate: { overall: 0, totalReviewed: 0 },
    };
    renderWithQueryClient(<EvaluationMetricsSection initialData={noReviews} />);

    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByText('human reviews have not yet begun')).toBeInTheDocument();
  });

  it('renders score distribution section', () => {
    renderWithQueryClient(<EvaluationMetricsSection initialData={mockMetrics} />);

    expect(screen.getByText('Score Distribution')).toBeInTheDocument();
  });
});

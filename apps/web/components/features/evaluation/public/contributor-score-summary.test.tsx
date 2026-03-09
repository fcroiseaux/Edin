import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { ContributorScoreSummary } from './contributor-score-summary';

// Mock the hook
const mockScores = {
  contributorId: 'c-1',
  averageScore: 75.5,
  evaluationCount: 8,
  narrative:
    "This contributor's work has been evaluated 8 times with an average quality score of 75.5, placing them in the Strong range.",
  recentScores: [
    { score: 80, contributionType: 'COMMIT', completedAt: '2026-03-01T00:00:00Z' },
    { score: 71, contributionType: 'DOCUMENTATION', completedAt: '2026-02-28T00:00:00Z' },
  ],
};

vi.mock('../../../../hooks/use-contributor-public-scores', () => ({
  useContributorPublicScores: vi.fn((id: string, enabled: boolean) => {
    if (!enabled) return { scores: null, isLoading: false, error: null };
    return { scores: mockScores, isLoading: false, error: null };
  }),
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ContributorScoreSummary', () => {
  it('renders narrative when contributor has consented', () => {
    renderWithQueryClient(
      <ContributorScoreSummary contributorId="c-1" showEvaluationScores={true} />,
    );

    expect(screen.getByText(/evaluated 8 times/)).toBeInTheDocument();
    expect(screen.getByText('Evaluation Summary')).toBeInTheDocument();
  });

  it('renders recent score badges', () => {
    renderWithQueryClient(
      <ContributorScoreSummary contributorId="c-1" showEvaluationScores={true} />,
    );

    expect(screen.getByText('80')).toBeInTheDocument();
    expect(screen.getByText('COMMIT')).toBeInTheDocument();
    expect(screen.getByText('71')).toBeInTheDocument();
    expect(screen.getByText('DOCUMENTATION')).toBeInTheDocument();
  });

  it('renders nothing when consent is not granted (invisible absence)', () => {
    const { container } = renderWithQueryClient(
      <ContributorScoreSummary contributorId="c-2" showEvaluationScores={false} />,
    );

    expect(container.innerHTML).toBe('');
  });
});

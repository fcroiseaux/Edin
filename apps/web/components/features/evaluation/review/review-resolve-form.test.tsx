import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReviewResolveForm } from './review-resolve-form';

vi.mock('../../../../hooks/use-evaluation-review', () => ({
  useResolveReview: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const dimensionScores = {
  complexity: { score: 80, explanation: 'Good complexity management' },
  maintainability: { score: 70, explanation: 'Decent structure' },
};

describe('ReviewResolveForm', () => {
  it('renders confirm and override radio options', () => {
    renderWithProviders(
      <ReviewResolveForm reviewId="review-1" currentDimensionScores={dimensionScores} />,
    );

    expect(screen.getByText('Confirm AI evaluation')).toBeInTheDocument();
    expect(screen.getByText('Override with adjusted scores')).toBeInTheDocument();
  });

  it('defaults to confirm action', () => {
    renderWithProviders(
      <ReviewResolveForm reviewId="review-1" currentDimensionScores={dimensionScores} />,
    );

    const confirmRadio = screen.getByDisplayValue('confirm') as HTMLInputElement;
    expect(confirmRadio.checked).toBe(true);
  });

  it('shows override fields when override is selected', () => {
    renderWithProviders(
      <ReviewResolveForm reviewId="review-1" currentDimensionScores={dimensionScores} />,
    );

    fireEvent.click(screen.getByDisplayValue('override'));

    expect(screen.getByText('Override Scores')).toBeInTheDocument();
    expect(screen.getByText('Composite Score (0-100)')).toBeInTheDocument();
    expect(screen.getByText(/complexity/)).toBeInTheDocument();
    expect(screen.getByText(/maintainability/)).toBeInTheDocument();
  });

  it('hides override fields when confirm is selected', () => {
    renderWithProviders(
      <ReviewResolveForm reviewId="review-1" currentDimensionScores={dimensionScores} />,
    );

    // Switch to override and back to confirm
    fireEvent.click(screen.getByDisplayValue('override'));
    expect(screen.getByText('Override Scores')).toBeInTheDocument();

    fireEvent.click(screen.getByDisplayValue('confirm'));
    expect(screen.queryByText('Override Scores')).not.toBeInTheDocument();
  });

  it('requires minimum 10 characters in reason', () => {
    renderWithProviders(
      <ReviewResolveForm reviewId="review-1" currentDimensionScores={dimensionScores} />,
    );

    const submitButton = screen.getByText('Confirm Evaluation');
    expect(submitButton).toBeDisabled();

    const textarea = screen.getByPlaceholderText('Explain your decision...');
    fireEvent.change(textarea, { target: { value: 'Good enough' } });

    expect(submitButton).not.toBeDisabled();
  });

  it('shows correct submit button label based on action', () => {
    renderWithProviders(
      <ReviewResolveForm reviewId="review-1" currentDimensionScores={dimensionScores} />,
    );

    expect(screen.getByText('Confirm Evaluation')).toBeInTheDocument();

    fireEvent.click(screen.getByDisplayValue('override'));
    expect(screen.getByText('Override Evaluation')).toBeInTheDocument();
  });

  it('disables submit when override selected without composite score', () => {
    renderWithProviders(
      <ReviewResolveForm reviewId="review-1" currentDimensionScores={dimensionScores} />,
    );

    const textarea = screen.getByPlaceholderText('Explain your decision...');
    fireEvent.change(textarea, { target: { value: 'Override reason text' } });

    fireEvent.click(screen.getByDisplayValue('override'));

    const submitButton = screen.getByText('Override Evaluation');
    expect(submitButton).toBeDisabled();
  });

  it('enables submit when override has valid composite score', () => {
    renderWithProviders(
      <ReviewResolveForm reviewId="review-1" currentDimensionScores={dimensionScores} />,
    );

    const textarea = screen.getByPlaceholderText('Explain your decision...');
    fireEvent.change(textarea, { target: { value: 'Override reason text' } });

    fireEvent.click(screen.getByDisplayValue('override'));

    const compositeInput = screen.getByLabelText('Composite Score (0-100)');
    fireEvent.change(compositeInput, { target: { value: '75' } });

    const submitButton = screen.getByText('Override Evaluation');
    expect(submitButton).not.toBeDisabled();
  });
});

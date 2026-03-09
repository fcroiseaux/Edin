import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FlagEvaluationDialog } from './flag-evaluation-dialog';

// Mock the hook
vi.mock('../../../../hooks/use-evaluation-review', () => ({
  useFlagEvaluation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('FlagEvaluationDialog', () => {
  it('renders the trigger button', () => {
    renderWithProviders(<FlagEvaluationDialog evaluationId="eval-1" />);
    expect(screen.getByText('Request Human Review')).toBeInTheDocument();
  });

  it('disables trigger when disabled prop is true', () => {
    renderWithProviders(<FlagEvaluationDialog evaluationId="eval-1" disabled />);
    expect(screen.getByText('Request Human Review')).toBeDisabled();
  });

  it('opens dialog and shows character counter', () => {
    renderWithProviders(<FlagEvaluationDialog evaluationId="eval-1" />);
    fireEvent.click(screen.getByText('Request Human Review'));

    expect(screen.getByText('Help us improve')).toBeInTheDocument();
    expect(screen.getByText('50 more characters needed')).toBeInTheDocument();
    expect(screen.getByText('0/2000')).toBeInTheDocument();
  });

  it('shows submit button disabled until 50 chars', () => {
    renderWithProviders(<FlagEvaluationDialog evaluationId="eval-1" />);
    fireEvent.click(screen.getByText('Request Human Review'));

    const submitButton = screen.getByText('Submit Review Request');
    expect(submitButton).toBeDisabled();

    const textarea = screen.getByLabelText('Reason for review request');
    fireEvent.change(textarea, { target: { value: 'A'.repeat(50) } });

    expect(screen.getByText('Ready to submit')).toBeInTheDocument();
    expect(submitButton).not.toBeDisabled();
  });

  it('updates character counter as user types', () => {
    renderWithProviders(<FlagEvaluationDialog evaluationId="eval-1" />);
    fireEvent.click(screen.getByText('Request Human Review'));

    const textarea = screen.getByLabelText('Reason for review request');
    fireEvent.change(textarea, { target: { value: 'Hello' } });

    expect(screen.getByText('45 more characters needed')).toBeInTheDocument();
    expect(screen.getByText('5/2000')).toBeInTheDocument();
  });
});

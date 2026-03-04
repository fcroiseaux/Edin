import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReviewList } from './review-list';
import { ReviewForm } from './review-form';
import { ApplicationDetailView } from './application-detail-view';

// Mock hooks
const mockUseMyReviews = vi.fn();
const mockUseReviewApplicationDetail = vi.fn();
const mockUseSubmitReview = vi.fn();

vi.mock('../../../../hooks/use-admission-reviewer', () => ({
  useMyReviews: (...args: unknown[]) => mockUseMyReviews(...args),
  useReviewApplicationDetail: (...args: unknown[]) => mockUseReviewApplicationDetail(...args),
  useSubmitReview: (...args: unknown[]) => mockUseSubmitReview(...args),
}));

vi.mock('../../../ui/toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const mockReviews = [
  {
    id: 'review-1',
    recommendation: '',
    feedback: '',
    createdAt: new Date().toISOString(),
    application: {
      id: 'app-1',
      applicantName: 'Alice Smith',
      domain: 'Technology',
      status: 'UNDER_REVIEW',
      createdAt: new Date().toISOString(),
    },
  },
  {
    id: 'review-2',
    recommendation: 'APPROVE',
    feedback: 'Excellent candidate with strong skills.',
    createdAt: new Date().toISOString(),
    application: {
      id: 'app-2',
      applicantName: 'Bob Jones',
      domain: 'Fintech',
      status: 'UNDER_REVIEW',
      createdAt: new Date().toISOString(),
    },
  },
];

describe('ReviewList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseReviewApplicationDetail.mockReturnValue({
      application: null,
      isLoading: false,
      error: null,
    });
  });

  it('renders loading skeleton', () => {
    mockUseMyReviews.mockReturnValue({ reviews: [], isLoading: true, error: null });

    renderWithProviders(<ReviewList />);

    expect(screen.getByRole('status', { name: /loading reviews/i })).toBeInTheDocument();
  });

  it('renders empty state when no reviews assigned', () => {
    mockUseMyReviews.mockReturnValue({ reviews: [], isLoading: false, error: null });

    renderWithProviders(<ReviewList />);

    expect(screen.getByText('No applications assigned for review.')).toBeInTheDocument();
  });

  it('renders review cards with applicant info', () => {
    mockUseMyReviews.mockReturnValue({
      reviews: mockReviews,
      isLoading: false,
      error: null,
    });

    renderWithProviders(<ReviewList />);

    expect(screen.getByText('My Reviews')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
  });

  it('separates pending and completed reviews', () => {
    mockUseMyReviews.mockReturnValue({
      reviews: mockReviews,
      isLoading: false,
      error: null,
    });

    renderWithProviders(<ReviewList />);

    expect(screen.getByText('Pending (1)')).toBeInTheDocument();
    expect(screen.getByText('Completed (1)')).toBeInTheDocument();
  });

  it('shows "Review" button for pending and "View Details" for completed', () => {
    mockUseMyReviews.mockReturnValue({
      reviews: mockReviews,
      isLoading: false,
      error: null,
    });

    renderWithProviders(<ReviewList />);

    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('View Details')).toBeInTheDocument();
  });

  it('renders domain badges on cards', () => {
    mockUseMyReviews.mockReturnValue({
      reviews: mockReviews,
      isLoading: false,
      error: null,
    });

    renderWithProviders(<ReviewList />);

    expect(screen.getAllByText('Technology').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fintech').length).toBeGreaterThan(0);
  });

  it('shows error message on failure', () => {
    mockUseMyReviews.mockReturnValue({
      reviews: [],
      isLoading: false,
      error: new Error('Network error'),
    });

    renderWithProviders(<ReviewList />);

    expect(screen.getByText('Failed to load reviews. Please try again.')).toBeInTheDocument();
  });
});

describe('ReviewForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSubmitReview.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('renders recommendation options and feedback field', () => {
    renderWithProviders(<ReviewForm applicationId="app-1" />);

    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Request More Info')).toBeInTheDocument();
    expect(screen.getByText('Decline')).toBeInTheDocument();
    expect(screen.getByLabelText('Feedback')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit review/i })).toBeInTheDocument();
  });

  it('validates feedback minimum length', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReviewForm applicationId="app-1" />);

    const approveRadio = screen.getByDisplayValue('APPROVE');
    await user.click(approveRadio);

    const feedback = screen.getByLabelText('Feedback');
    await user.type(feedback, 'Short');

    const submitBtn = screen.getByRole('button', { name: /submit review/i });
    await user.click(submitBtn);

    // Validation error should appear (min 10 chars)
    expect(await screen.findByText(/feedback must be at least 10 characters/i)).toBeInTheDocument();
  });

  it('submits review with valid data', async () => {
    const mockMutateAsync = vi.fn().mockResolvedValueOnce({});
    mockUseSubmitReview.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });

    const user = userEvent.setup();
    const onSuccess = vi.fn();
    renderWithProviders(<ReviewForm applicationId="app-1" onSuccess={onSuccess} />);

    await user.click(screen.getByDisplayValue('APPROVE'));
    await user.type(
      screen.getByLabelText('Feedback'),
      'This is an excellent candidate with great skills.',
    );
    await user.click(screen.getByRole('button', { name: /submit review/i }));

    await vi.waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        applicationId: 'app-1',
        recommendation: 'APPROVE',
        feedback: 'This is an excellent candidate with great skills.',
      });
    });
  });
});

describe('ApplicationDetailView', () => {
  const mockApp = {
    applicantName: 'Alice Smith',
    domain: 'Technology',
    statementOfInterest: 'I am passionate about open source.',
    microTaskDomain: 'Technology',
    microTaskResponse: 'Here is my detailed solution to the micro-task.',
    microTaskSubmissionUrl: 'https://github.com/alice/project',
    createdAt: new Date().toISOString(),
  };

  it('renders applicant info', () => {
    render(<ApplicationDetailView application={mockApp} />);

    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
  });

  it('renders statement of interest', () => {
    render(<ApplicationDetailView application={mockApp} />);

    expect(screen.getByText('I am passionate about open source.')).toBeInTheDocument();
  });

  it('renders micro-task response', () => {
    render(<ApplicationDetailView application={mockApp} />);

    expect(screen.getByText('Here is my detailed solution to the micro-task.')).toBeInTheDocument();
  });

  it('renders submission URL link', () => {
    render(<ApplicationDetailView application={mockApp} />);

    const link = screen.getByText('View submission');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://github.com/alice/project');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('does not render submission link when URL is null', () => {
    render(<ApplicationDetailView application={{ ...mockApp, microTaskSubmissionUrl: null }} />);

    expect(screen.queryByText('View submission')).not.toBeInTheDocument();
  });

  it('has accessible heading structure', () => {
    render(<ApplicationDetailView application={mockApp} />);

    expect(screen.getByText('Statement of Interest')).toBeInTheDocument();
    expect(screen.getByText(/Micro-task Response/)).toBeInTheDocument();
  });
});

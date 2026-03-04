import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdmissionQueue } from './admission-queue';
import { AdmissionQueueSkeleton } from './admission-queue-skeleton';

// Mock hooks
const mockUseAdmissionQueue = vi.fn();
const mockUseApplicationDetail = vi.fn();
const mockUseAvailableReviewers = vi.fn();
const mockUseAssignReviewer = vi.fn();
const mockUseUpdateApplicationStatus = vi.fn();

vi.mock('../../../../hooks/use-admission-admin', () => ({
  useAdmissionQueue: (...args: unknown[]) => mockUseAdmissionQueue(...args),
  useApplicationDetail: (...args: unknown[]) => mockUseApplicationDetail(...args),
  useAvailableReviewers: (...args: unknown[]) => mockUseAvailableReviewers(...args),
  useAssignReviewer: (...args: unknown[]) => mockUseAssignReviewer(...args),
  useUpdateApplicationStatus: (...args: unknown[]) => mockUseUpdateApplicationStatus(...args),
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

const mockApplications = [
  {
    id: 'app-1',
    applicantName: 'Alice Smith',
    domain: 'Technology',
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    reviews: [],
  },
  {
    id: 'app-2',
    applicantName: 'Bob Jones',
    domain: 'Fintech',
    status: 'UNDER_REVIEW',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    reviews: [
      {
        id: 'rev-1',
        reviewer: { id: 'r-1', name: 'Carol', domain: 'Technology' },
        recommendation: 'APPROVE',
      },
    ],
  },
];

describe('AdmissionQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApplicationDetail.mockReturnValue({ application: null, isLoading: false, error: null });
    mockUseAvailableReviewers.mockReturnValue({ reviewers: [], isLoading: false });
    mockUseAssignReviewer.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseUpdateApplicationStatus.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('renders skeleton when loading', () => {
    mockUseAdmissionQueue.mockReturnValue({
      applications: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<AdmissionQueue />);

    expect(screen.getByRole('status', { name: /loading admission queue/i })).toBeInTheDocument();
  });

  it('renders queue with application data', () => {
    mockUseAdmissionQueue.mockReturnValue({
      applications: mockApplications,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<AdmissionQueue />);

    expect(screen.getByText('Admission Queue')).toBeInTheDocument();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
  });

  it('renders domain badges correctly', () => {
    mockUseAdmissionQueue.mockReturnValue({
      applications: mockApplications,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<AdmissionQueue />);

    expect(screen.getAllByText('Technology').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fintech').length).toBeGreaterThan(0);
  });

  it('renders status badges', () => {
    mockUseAdmissionQueue.mockReturnValue({
      applications: mockApplications,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<AdmissionQueue />);

    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Under Review').length).toBeGreaterThan(0);
  });

  it('renders empty state when no applications', () => {
    mockUseAdmissionQueue.mockReturnValue({
      applications: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<AdmissionQueue />);

    expect(screen.getByText('No applications pending review.')).toBeInTheDocument();
  });

  it('shows reviewer names in the table', () => {
    mockUseAdmissionQueue.mockReturnValue({
      applications: mockApplications,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<AdmissionQueue />);

    expect(screen.getByText('Carol')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('opens detail panel on row click', async () => {
    const user = userEvent.setup();
    mockUseAdmissionQueue.mockReturnValue({
      applications: mockApplications,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<AdmissionQueue />);

    const row = screen.getByRole('button', { name: /view alice smith/i });
    await user.click(row);

    // Panel should open (Dialog renders with role="dialog")
    expect(mockUseApplicationDetail).toHaveBeenCalledWith('app-1');
  });

  it('has accessible row buttons', () => {
    mockUseAdmissionQueue.mockReturnValue({
      applications: mockApplications,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<AdmissionQueue />);

    const buttons = screen.getAllByRole('button', { name: /view .+ application/i });
    expect(buttons).toHaveLength(2);
  });
});

describe('AdmissionQueueSkeleton', () => {
  it('renders with accessible loading indicator', () => {
    render(<AdmissionQueueSkeleton />);

    expect(screen.getByRole('status', { name: /loading admission queue/i })).toBeInTheDocument();
  });
});

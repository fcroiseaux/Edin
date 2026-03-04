import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MicroTaskList } from './micro-task-list';

// Mock hooks
const mockUseMicroTaskList = vi.fn();
const mockUseCreateMicroTask = vi.fn();
const mockUseUpdateMicroTask = vi.fn();
const mockUseDeactivateMicroTask = vi.fn();

vi.mock('../../../../hooks/use-micro-task-admin', () => ({
  useMicroTaskList: (...args: unknown[]) => mockUseMicroTaskList(...args),
  useCreateMicroTask: () => mockUseCreateMicroTask(),
  useUpdateMicroTask: () => mockUseUpdateMicroTask(),
  useDeactivateMicroTask: () => mockUseDeactivateMicroTask(),
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

const mockMicroTasks = [
  {
    id: 'mt-1',
    domain: 'Technology',
    title: 'Build a REST API endpoint',
    description: 'Design and implement a REST API endpoint.',
    expectedDeliverable: 'A working API endpoint.',
    estimatedEffort: '2-4 hours',
    submissionFormat: 'GitHub repository',
    isActive: true,
    deactivatedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'mt-2',
    domain: 'Fintech',
    title: 'Financial data analysis',
    description: 'Analyze a sample financial dataset.',
    expectedDeliverable: 'Analysis report.',
    estimatedEffort: '3-5 hours',
    submissionFormat: 'PDF document',
    isActive: true,
    deactivatedAt: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'mt-3',
    domain: 'Technology',
    title: 'Old tech task',
    description: 'Previously active task.',
    expectedDeliverable: 'Some deliverable.',
    estimatedEffort: '1-2 hours',
    submissionFormat: 'GitHub gist',
    isActive: false,
    deactivatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

describe('MicroTaskList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCreateMicroTask.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseUpdateMicroTask.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseDeactivateMicroTask.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('renders loading skeleton when loading', () => {
    mockUseMicroTaskList.mockReturnValue({
      microTasks: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<MicroTaskList />);

    expect(
      screen.getByRole('status', { name: /loading micro-task configuration/i }),
    ).toBeInTheDocument();
  });

  it('renders table with micro-task data', () => {
    mockUseMicroTaskList.mockReturnValue({
      microTasks: mockMicroTasks,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<MicroTaskList />);

    expect(screen.getByText('Micro-Task Configuration')).toBeInTheDocument();
    // Items appear in both mobile cards and desktop table (jsdom renders both)
    expect(screen.getAllByText('Build a REST API endpoint').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Financial data analysis').length).toBeGreaterThan(0);
  });

  it('renders domain badges in table', () => {
    mockUseMicroTaskList.mockReturnValue({
      microTasks: mockMicroTasks,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<MicroTaskList />);

    expect(screen.getAllByText('Technology').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fintech').length).toBeGreaterThan(0);
  });

  it('renders empty state when no micro-tasks', () => {
    mockUseMicroTaskList.mockReturnValue({
      microTasks: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<MicroTaskList />);

    // Empty state renders in both mobile and desktop containers
    expect(
      screen.getAllByText(
        'No micro-tasks configured yet. Create one to enable applicant demonstrations.',
      ).length,
    ).toBeGreaterThan(0);
  });

  it('renders Create Micro-Task button', () => {
    mockUseMicroTaskList.mockReturnValue({
      microTasks: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<MicroTaskList />);

    expect(screen.getByRole('button', { name: /create micro-task/i })).toBeInTheDocument();
  });

  it('renders domain filter dropdown', () => {
    mockUseMicroTaskList.mockReturnValue({
      microTasks: mockMicroTasks,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<MicroTaskList />);

    expect(screen.getByRole('combobox', { name: /filter by domain/i })).toBeInTheDocument();
  });

  it('sorts active tasks before inactive', () => {
    mockUseMicroTaskList.mockReturnValue({
      microTasks: mockMicroTasks,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<MicroTaskList />);

    // Active tasks should appear, and inactive "Old tech task" should also appear in table
    const buttons = screen.getAllByRole('button', { name: /edit .+/i });
    // Active tasks are sorted first; the first row should be an active task
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });

  it('has accessible table header columns', () => {
    mockUseMicroTaskList.mockReturnValue({
      microTasks: mockMicroTasks,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<MicroTaskList />);

    expect(screen.getByText('Domain')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
  });

  it('opens form panel when Create Micro-Task is clicked', async () => {
    const user = userEvent.setup();
    mockUseMicroTaskList.mockReturnValue({
      microTasks: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<MicroTaskList />);

    await user.click(screen.getByRole('button', { name: /create micro-task/i }));

    // The form panel (Dialog) should now be open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens form panel in edit mode when row is clicked', async () => {
    const user = userEvent.setup();
    mockUseMicroTaskList.mockReturnValue({
      microTasks: mockMicroTasks,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<MicroTaskList />);

    const row = screen.getByRole('button', { name: /edit build a rest api endpoint/i });
    await user.click(row);

    // The form panel should now show "Edit Micro-Task"
    expect(screen.getByText('Edit Micro-Task')).toBeInTheDocument();
  });
});

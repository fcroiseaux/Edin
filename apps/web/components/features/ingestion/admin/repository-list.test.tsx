import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RepositoryList } from './repository-list';

const mockUseRepositories = vi.fn();
const mockUseRemoveRepository = vi.fn();
const mockUseRetryWebhook = vi.fn();
const mockUseAddRepository = vi.fn();

vi.mock('../../../../hooks/use-repositories', () => ({
  useRepositories: (...args: unknown[]) => mockUseRepositories(...args),
  useRemoveRepository: () => mockUseRemoveRepository(),
  useRetryWebhook: () => mockUseRetryWebhook(),
  useAddRepository: () => mockUseAddRepository(),
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

const mockRepositories = [
  {
    id: 'repo-1',
    owner: 'edin-foundation',
    repo: 'edin-core',
    fullName: 'edin-foundation/edin-core',
    webhookId: 12345,
    status: 'ACTIVE',
    statusMessage: null,
    addedById: 'admin-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'repo-2',
    owner: 'edin-foundation',
    repo: 'edin-docs',
    fullName: 'edin-foundation/edin-docs',
    webhookId: null,
    status: 'ERROR',
    statusMessage: 'GitHub App needs admin access to this repository',
    addedById: 'admin-1',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'repo-3',
    owner: 'edin-foundation',
    repo: 'edin-web',
    fullName: 'edin-foundation/edin-web',
    webhookId: null,
    status: 'PENDING',
    statusMessage: 'Webhook registration pending',
    addedById: 'admin-1',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

describe('RepositoryList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRemoveRepository.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseRetryWebhook.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseAddRepository.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
  });

  it('renders loading skeleton when loading', () => {
    mockUseRepositories.mockReturnValue({
      repositories: [],
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<RepositoryList />);

    expect(
      screen.getByRole('status', { name: /loading repository monitoring/i }),
    ).toBeInTheDocument();
  });

  it('renders repositories in table', () => {
    mockUseRepositories.mockReturnValue({
      repositories: mockRepositories,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<RepositoryList />);

    expect(screen.getByText('Repository Monitoring')).toBeInTheDocument();
    expect(screen.getAllByText('edin-foundation/edin-core').length).toBeGreaterThan(0);
    expect(screen.getAllByText('edin-foundation/edin-docs').length).toBeGreaterThan(0);
  });

  it('renders status indicators', () => {
    mockUseRepositories.mockReturnValue({
      repositories: mockRepositories,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<RepositoryList />);

    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Error').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
  });

  it('renders empty state when no repositories', () => {
    mockUseRepositories.mockReturnValue({
      repositories: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<RepositoryList />);

    expect(
      screen.getAllByText(
        'No repositories monitored yet. Add a GitHub repository to start tracking contributions.',
      ).length,
    ).toBeGreaterThan(0);
  });

  it('renders Add Repository button', () => {
    mockUseRepositories.mockReturnValue({
      repositories: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<RepositoryList />);

    expect(screen.getByRole('button', { name: /add repository/i })).toBeInTheDocument();
  });

  it('shows retry button for error repos', () => {
    mockUseRepositories.mockReturnValue({
      repositories: mockRepositories,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<RepositoryList />);

    const retryButtons = screen.getAllByRole('button', { name: /retry/i });
    expect(retryButtons.length).toBeGreaterThan(0);
  });

  it('shows remove confirmation dialog when Remove is clicked', async () => {
    const user = userEvent.setup();
    mockUseRepositories.mockReturnValue({
      repositories: mockRepositories,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<RepositoryList />);

    const removeButtons = screen.getAllByRole('button', { name: /^remove$/i });
    await user.click(removeButtons[0]);

    expect(screen.getByText('Remove Repository')).toBeInTheDocument();
    expect(screen.getByText(/previously ingested contributions will remain/i)).toBeInTheDocument();
  });

  it('opens add form when Add Repository is clicked', async () => {
    const user = userEvent.setup();
    mockUseRepositories.mockReturnValue({
      repositories: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<RepositoryList />);

    await user.click(screen.getByRole('button', { name: /add repository/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

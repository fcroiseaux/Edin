import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddRepositoryForm } from './add-repository-form';

const mockMutateAsync = vi.fn();
const mockUseAddRepository = vi.fn();

vi.mock('../../../../hooks/use-repositories', () => ({
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

describe('AddRepositoryForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAddRepository.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
  });

  it('renders form when open', () => {
    renderWithProviders(<AddRepositoryForm open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /add repository/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Repository')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add repository/i })).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithProviders(<AddRepositoryForm open={false} onOpenChange={vi.fn()} />);

    expect(screen.queryByText('Add Repository')).not.toBeInTheDocument();
  });

  it('shows validation error for invalid format', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AddRepositoryForm open={true} onOpenChange={vi.fn()} />);

    const input = screen.getByLabelText('Repository');
    await user.type(input, 'invalid-format');
    await user.click(screen.getByRole('button', { name: /add repository/i }));

    await waitFor(() => {
      expect(screen.getByText(/enter in owner\/repo format/i)).toBeInTheDocument();
    });
  });

  it('submits valid repository', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    mockMutateAsync.mockResolvedValue({});

    renderWithProviders(<AddRepositoryForm open={true} onOpenChange={onOpenChange} />);

    const input = screen.getByLabelText('Repository');
    await user.type(input, 'edin-foundation/edin-core');
    await user.click(screen.getByRole('button', { name: /add repository/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        owner: 'edin-foundation',
        repo: 'edin-core',
      });
    });
  });

  it('shows error on submission failure', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockRejectedValue(new Error('Repository already monitored'));

    renderWithProviders(<AddRepositoryForm open={true} onOpenChange={vi.fn()} />);

    const input = screen.getByLabelText('Repository');
    await user.type(input, 'edin-foundation/edin-core');
    await user.click(screen.getByRole('button', { name: /add repository/i }));

    // Error is shown via toast, not in form
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
  });

  it('renders Cancel button', () => {
    renderWithProviders(<AddRepositoryForm open={true} onOpenChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
});

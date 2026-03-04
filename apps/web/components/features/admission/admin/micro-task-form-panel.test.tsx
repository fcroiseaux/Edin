import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MicroTaskFormPanel } from './micro-task-form-panel';

// Mock hooks
const mockCreateMutateAsync = vi.fn();
const mockUpdateMutateAsync = vi.fn();
const mockToast = vi.fn();

vi.mock('../../../../hooks/use-micro-task-admin', () => ({
  useCreateMicroTask: () => ({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  }),
  useUpdateMicroTask: () => ({
    mutateAsync: mockUpdateMutateAsync,
    isPending: false,
  }),
}));

vi.mock('../../../ui/toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const mockEditTask = {
  id: 'mt-1',
  domain: 'Technology',
  title: 'Build a REST API endpoint',
  description: 'Design and implement a REST API endpoint for user management.',
  expectedDeliverable: 'A working API endpoint with tests.',
  estimatedEffort: '2-4 hours',
  submissionFormat: 'GitHub repository link',
  isActive: true,
  deactivatedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('MicroTaskFormPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateMutateAsync.mockResolvedValue({});
    mockUpdateMutateAsync.mockResolvedValue({});
  });

  it('renders create mode when editTask is null', () => {
    renderWithProviders(<MicroTaskFormPanel open={true} onOpenChange={vi.fn()} editTask={null} />);

    // Both dialog title and submit button contain "Create Micro-Task"
    expect(screen.getAllByText('Create Micro-Task').length).toBe(2);
    expect(screen.getByRole('button', { name: /create micro-task/i })).toBeInTheDocument();
  });

  it('renders edit mode when editTask is provided', () => {
    renderWithProviders(
      <MicroTaskFormPanel open={true} onOpenChange={vi.fn()} editTask={mockEditTask} />,
    );

    expect(screen.getByText('Edit Micro-Task')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update micro-task/i })).toBeInTheDocument();
  });

  it('renders all form fields', () => {
    renderWithProviders(<MicroTaskFormPanel open={true} onOpenChange={vi.fn()} editTask={null} />);

    expect(screen.getByLabelText('Domain')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
    expect(screen.getByLabelText('Expected Deliverable')).toBeInTheDocument();
    expect(screen.getByLabelText('Estimated Effort')).toBeInTheDocument();
    expect(screen.getByLabelText('Submission Format')).toBeInTheDocument();
  });

  it('populates form fields in edit mode', () => {
    renderWithProviders(
      <MicroTaskFormPanel open={true} onOpenChange={vi.fn()} editTask={mockEditTask} />,
    );

    expect(screen.getByLabelText('Title')).toHaveValue('Build a REST API endpoint');
    expect(screen.getByLabelText('Description')).toHaveValue(
      'Design and implement a REST API endpoint for user management.',
    );
    expect(screen.getByLabelText('Expected Deliverable')).toHaveValue(
      'A working API endpoint with tests.',
    );
    expect(screen.getByLabelText('Estimated Effort')).toHaveValue('2-4 hours');
    expect(screen.getByLabelText('Submission Format')).toHaveValue('GitHub repository link');
  });

  it('disables domain selector in edit mode', () => {
    renderWithProviders(
      <MicroTaskFormPanel open={true} onOpenChange={vi.fn()} editTask={mockEditTask} />,
    );

    expect(screen.getByLabelText('Domain')).toBeDisabled();
  });

  it('enables domain selector in create mode', () => {
    renderWithProviders(<MicroTaskFormPanel open={true} onOpenChange={vi.fn()} editTask={null} />);

    expect(screen.getByLabelText('Domain')).not.toBeDisabled();
  });

  it('has a close button', () => {
    renderWithProviders(<MicroTaskFormPanel open={true} onOpenChange={vi.fn()} editTask={null} />);

    expect(screen.getByRole('button', { name: /close panel/i })).toBeInTheDocument();
  });

  it('shows all domain options in selector', () => {
    renderWithProviders(<MicroTaskFormPanel open={true} onOpenChange={vi.fn()} editTask={null} />);

    const select = screen.getByLabelText('Domain');
    const options = select.querySelectorAll('option');
    const optionTexts = Array.from(options).map((o) => o.textContent);

    expect(optionTexts).toContain('Technology');
    expect(optionTexts).toContain('Fintech');
    expect(optionTexts).toContain('Impact');
    expect(optionTexts).toContain('Governance');
  });

  it('calls create mutation on submit in create mode', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    renderWithProviders(
      <MicroTaskFormPanel open={true} onOpenChange={onOpenChange} editTask={null} />,
    );

    await user.type(screen.getByLabelText('Title'), 'New task title');
    await user.type(screen.getByLabelText('Description'), 'Task description here');
    await user.type(screen.getByLabelText('Expected Deliverable'), 'A deliverable');
    await user.type(screen.getByLabelText('Estimated Effort'), '1-2 hours');
    await user.type(screen.getByLabelText('Submission Format'), 'GitHub gist');

    await user.click(screen.getByRole('button', { name: /create micro-task/i }));

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          domain: 'Technology',
          title: 'New task title',
          description: 'Task description here',
          expectedDeliverable: 'A deliverable',
          estimatedEffort: '1-2 hours',
          submissionFormat: 'GitHub gist',
        }),
      );
    });
  });

  it('calls update mutation on submit in edit mode', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    renderWithProviders(
      <MicroTaskFormPanel open={true} onOpenChange={onOpenChange} editTask={mockEditTask} />,
    );

    const titleInput = screen.getByLabelText('Title');
    await user.clear(titleInput);
    await user.type(titleInput, 'Updated title');

    await user.click(screen.getByRole('button', { name: /update micro-task/i }));

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mt-1',
          title: 'Updated title',
        }),
      );
    });
  });

  it('shows toast on successful creation', async () => {
    const user = userEvent.setup();
    mockCreateMutateAsync.mockResolvedValueOnce({});

    renderWithProviders(<MicroTaskFormPanel open={true} onOpenChange={vi.fn()} editTask={null} />);

    await user.type(screen.getByLabelText('Title'), 'New task');
    await user.type(screen.getByLabelText('Description'), 'Description');
    await user.type(screen.getByLabelText('Expected Deliverable'), 'Deliverable');
    await user.type(screen.getByLabelText('Estimated Effort'), '1 hour');
    await user.type(screen.getByLabelText('Submission Format'), 'Link');

    await user.click(screen.getByRole('button', { name: /create micro-task/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({ title: 'Micro-task created' });
    });
  });

  it('shows toast on error', async () => {
    const user = userEvent.setup();
    mockCreateMutateAsync.mockRejectedValueOnce(new Error('Server error'));

    renderWithProviders(<MicroTaskFormPanel open={true} onOpenChange={vi.fn()} editTask={null} />);

    await user.type(screen.getByLabelText('Title'), 'New task');
    await user.type(screen.getByLabelText('Description'), 'Description');
    await user.type(screen.getByLabelText('Expected Deliverable'), 'Deliverable');
    await user.type(screen.getByLabelText('Estimated Effort'), '1 hour');
    await user.type(screen.getByLabelText('Submission Format'), 'Link');

    await user.click(screen.getByRole('button', { name: /create micro-task/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Server error',
        variant: 'error',
      });
    });
  });

  it('does not render content when closed', () => {
    renderWithProviders(<MicroTaskFormPanel open={false} onOpenChange={vi.fn()} editTask={null} />);

    expect(screen.queryByText('Create Micro-Task')).not.toBeInTheDocument();
  });
});

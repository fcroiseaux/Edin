import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApplicationForm } from './application-form';
import { ApplicationConfirmation } from './application-confirmation';
import { MicroTaskDisplay } from './micro-task-display';
import { GdprConsent } from './gdpr-consent';
import { AdmissionSkeleton } from './admission-skeleton';

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ApplicationForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('renders form with all required fields', () => {
    render(<ApplicationForm />);

    expect(screen.getByLabelText('Full Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    expect(screen.getByLabelText('Primary Domain')).toBeInTheDocument();
    expect(screen.getByLabelText('Statement of Interest')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit application/i })).toBeInTheDocument();
  });

  it('shows domain selector with all four domain options', () => {
    render(<ApplicationForm />);

    const select = screen.getByLabelText('Primary Domain');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Fintech')).toBeInTheDocument();
    expect(screen.getByText('Impact')).toBeInTheDocument();
    expect(screen.getByText('Governance')).toBeInTheDocument();
  });

  it('shows character count for statement of interest', () => {
    render(<ApplicationForm />);

    expect(screen.getByText('0/300')).toBeInTheDocument();
  });

  it('does not show micro-task fields until domain is selected', () => {
    render(<ApplicationForm />);

    expect(screen.queryByLabelText('Your Response')).not.toBeInTheDocument();
  });

  it('shows micro-task response field after domain selection', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          data: {
            id: 'task-1',
            domain: 'Technology',
            title: 'Build a REST API endpoint',
            description: 'Test description',
            expectedDeliverable: 'Test deliverable',
            estimatedEffort: '2-4 hours',
            submissionFormat: 'GitHub gist',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
    });

    const user = userEvent.setup();
    render(<ApplicationForm />);

    const domainSelect = screen.getByLabelText('Primary Domain');
    await user.selectOptions(domainSelect, 'Technology');

    await waitFor(() => {
      expect(screen.getByLabelText('Your Response')).toBeInTheDocument();
    });
  });

  it('shows validation errors on blur for empty required fields', async () => {
    const user = userEvent.setup();
    render(<ApplicationForm />);

    const nameInput = screen.getByLabelText('Full Name');
    await user.click(nameInput);
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup();
    render(<ApplicationForm />);

    const emailInput = screen.getByLabelText('Email Address');
    await user.type(emailInput, 'not-an-email');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    });
  });

  it('shows confirmation after successful submission', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              id: 'task-1',
              domain: 'Technology',
              title: 'Build a REST API',
              description: 'Test',
              expectedDeliverable: 'Test',
              estimatedEffort: '2-4 hours',
              submissionFormat: 'GitHub',
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { id: 'app-1', status: 'PENDING' } }),
      });

    const user = userEvent.setup();
    render(<ApplicationForm />);

    await user.type(screen.getByLabelText('Full Name'), 'Jane Doe');
    await user.type(screen.getByLabelText('Email Address'), 'jane@example.com');
    await user.selectOptions(screen.getByLabelText('Primary Domain'), 'Technology');

    await waitFor(() => {
      expect(screen.getByLabelText('Your Response')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Statement of Interest'), 'I want to contribute.');
    await user.type(screen.getByLabelText('Your Response'), 'My detailed response.');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /submit application/i }));

    await waitFor(() => {
      expect(screen.getByText('Application Received')).toBeInTheDocument();
      expect(screen.getByText(/We'll review your application within 48 hours/)).toBeInTheDocument();
    });
  });

  it('shows error message when submission fails', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              id: 'task-1',
              domain: 'Technology',
              title: 'Build a REST API',
              description: 'Test',
              expectedDeliverable: 'Test',
              estimatedEffort: '2-4 hours',
              submissionFormat: 'GitHub',
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: () =>
          Promise.resolve({
            error: { message: 'Application submission failed' },
          }),
      });

    const user = userEvent.setup();
    render(<ApplicationForm />);

    await user.type(screen.getByLabelText('Full Name'), 'Jane Doe');
    await user.type(screen.getByLabelText('Email Address'), 'jane@example.com');
    await user.selectOptions(screen.getByLabelText('Primary Domain'), 'Technology');

    await waitFor(() => {
      expect(screen.getByLabelText('Your Response')).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText('Statement of Interest'), 'I want to contribute.');
    await user.type(screen.getByLabelText('Your Response'), 'My detailed response.');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /submit application/i }));

    await waitFor(() => {
      expect(screen.getByText('Application submission failed')).toBeInTheDocument();
    });
  });
});

describe('ApplicationConfirmation', () => {
  it('renders confirmation message', () => {
    render(<ApplicationConfirmation />);

    expect(screen.getByText('Application Received')).toBeInTheDocument();
    expect(screen.getByText(/We'll review your application within 48 hours/)).toBeInTheDocument();
  });

  it('has appropriate accessibility role', () => {
    render(<ApplicationConfirmation />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('MicroTaskDisplay', () => {
  const mockTask = {
    id: 'task-1',
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
  };

  it('renders micro-task title and description', () => {
    render(<MicroTaskDisplay microTask={mockTask} />);

    expect(screen.getByText('Build a REST API endpoint')).toBeInTheDocument();
    expect(screen.getByText('Design and implement a REST API endpoint.')).toBeInTheDocument();
  });

  it('displays expected deliverable, effort, and submission format', () => {
    render(<MicroTaskDisplay microTask={mockTask} />);

    expect(screen.getByText('A working API endpoint.')).toBeInTheDocument();
    expect(screen.getByText('2-4 hours')).toBeInTheDocument();
    expect(screen.getByText('GitHub repository')).toBeInTheDocument();
  });

  it('has appropriate accessibility label', () => {
    render(<MicroTaskDisplay microTask={mockTask} />);

    expect(screen.getByLabelText('Micro-task assignment')).toBeInTheDocument();
  });

  it('renders markdown formatting in description as rich text', () => {
    render(
      <MicroTaskDisplay
        microTask={{
          ...mockTask,
          description: '**Bold** intro\n- first item\n- second item',
        }}
      />,
    );

    expect(screen.getByText('Bold')).toBeInTheDocument();
    expect(screen.getByText('first item')).toBeInTheDocument();
    expect(screen.getByText('second item')).toBeInTheDocument();
  });
});

describe('GdprConsent', () => {
  const defaultProps = {
    checked: false,
    onChange: vi.fn(),
    onBlur: vi.fn(),
    name: 'gdprConsent',
    inputRef: vi.fn(),
  };

  it('renders checkbox with consent text', () => {
    render(<GdprConsent {...defaultProps} />);

    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByText(/Data Processing Agreement/)).toBeInTheDocument();
  });

  it('shows error when provided', () => {
    const error = { message: 'Consent is required', type: 'validate' as const };
    render(<GdprConsent {...defaultProps} error={error} />);

    expect(screen.getByText('Consent is required')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('calls onChange when clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<GdprConsent {...defaultProps} onChange={onChange} />);

    await user.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('sets aria-invalid when error exists', () => {
    const error = { message: 'Required', type: 'validate' as const };
    render(<GdprConsent {...defaultProps} error={error} />);

    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('AdmissionSkeleton', () => {
  it('renders with loading status role', () => {
    render(<AdmissionSkeleton />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has accessible loading label', () => {
    render(<AdmissionSkeleton />);

    expect(screen.getByLabelText('Loading application form')).toBeInTheDocument();
  });
});

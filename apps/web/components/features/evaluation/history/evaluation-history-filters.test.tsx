import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EvaluationHistoryFilters } from './evaluation-history-filters';

describe('EvaluationHistoryFilters', () => {
  const defaultProps = {
    contributionType: '',
    timePeriod: '',
    onContributionTypeChange: vi.fn(),
    onTimePeriodChange: vi.fn(),
  };

  it('renders all contribution type buttons', () => {
    render(<EvaluationHistoryFilters {...defaultProps} />);

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Code')).toBeInTheDocument();
    expect(screen.getByText('Pull Requests')).toBeInTheDocument();
    expect(screen.getByText('Documentation')).toBeInTheDocument();
  });

  it('renders time period select with options', () => {
    render(<EvaluationHistoryFilters {...defaultProps} />);

    const select = screen.getByLabelText('Time period filter');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Last 30 days')).toBeInTheDocument();
    expect(screen.getByText('All time')).toBeInTheDocument();
  });

  it('calls onContributionTypeChange when type button is clicked', async () => {
    const onContributionTypeChange = vi.fn();
    const user = userEvent.setup();

    render(
      <EvaluationHistoryFilters
        {...defaultProps}
        onContributionTypeChange={onContributionTypeChange}
      />,
    );

    await user.click(screen.getByText('Code'));
    expect(onContributionTypeChange).toHaveBeenCalledWith('COMMIT');
  });

  it('calls onTimePeriodChange when select value changes', async () => {
    const onTimePeriodChange = vi.fn();
    const user = userEvent.setup();

    render(<EvaluationHistoryFilters {...defaultProps} onTimePeriodChange={onTimePeriodChange} />);

    await user.selectOptions(screen.getByLabelText('Time period filter'), '90');
    expect(onTimePeriodChange).toHaveBeenCalledWith('90');
  });

  it('highlights active contribution type with aria-pressed', () => {
    render(<EvaluationHistoryFilters {...defaultProps} contributionType="COMMIT" />);

    expect(screen.getByText('Code')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('All')).toHaveAttribute('aria-pressed', 'false');
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DimensionAccordion } from './dimension-accordion';

describe('DimensionAccordion', () => {
  const codeDimensions = {
    complexity: { score: 75, explanation: 'Code has moderate complexity with clean structure.' },
    maintainability: {
      score: 88,
      explanation: 'Well-organized code with clear naming conventions.',
    },
    testCoverage: { score: 60, explanation: 'Adequate test coverage for core paths.' },
    standardsAdherence: { score: 82, explanation: 'Follows project conventions consistently.' },
  };

  it('renders all dimensions with descriptive labels', () => {
    render(<DimensionAccordion dimensionScores={codeDimensions} />);

    expect(screen.getByText('Strong code complexity')).toBeInTheDocument();
    expect(screen.getByText('Exceptional maintainability')).toBeInTheDocument();
    expect(screen.getByText('Solid test coverage')).toBeInTheDocument();
    expect(screen.getByText('Exceptional standards adherence')).toBeInTheDocument();
  });

  it('expands to show explanation on click', async () => {
    const user = userEvent.setup();
    render(<DimensionAccordion dimensionScores={codeDimensions} />);

    const trigger = screen.getByText('Strong code complexity');
    await user.click(trigger);

    expect(
      screen.getByText('Code has moderate complexity with clean structure.'),
    ).toBeInTheDocument();
  });

  it('shows progress bar with correct aria attributes', async () => {
    const user = userEvent.setup();
    render(<DimensionAccordion dimensionScores={codeDimensions} />);

    await user.click(screen.getByText('Strong code complexity'));

    const progressBar = screen.getByRole('progressbar', { name: /Code Complexity/ });
    expect(progressBar).toHaveAttribute('aria-valuenow', '75');
  });

  it('handles null dimensionScores', () => {
    render(<DimensionAccordion dimensionScores={null} />);

    expect(screen.getByText('Dimension scores are not available.')).toBeInTheDocument();
  });

  it('handles empty dimensionScores', () => {
    render(<DimensionAccordion dimensionScores={{}} />);

    expect(screen.getByText('Dimension scores are not available.')).toBeInTheDocument();
  });

  it('renders doc dimensions correctly', () => {
    const docDimensions = {
      structuralCompleteness: { score: 90, explanation: 'All required sections present.' },
      readability: { score: 72, explanation: 'Good readability with appropriate language level.' },
      referenceIntegrity: { score: 45, explanation: 'Some broken links detected.' },
    };

    render(<DimensionAccordion dimensionScores={docDimensions} />);

    expect(screen.getByText('Exceptional structural completeness')).toBeInTheDocument();
    expect(screen.getByText('Strong readability')).toBeInTheDocument();
    expect(screen.getByText('Solid reference integrity')).toBeInTheDocument();
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProvenanceSection } from './provenance-section';

describe('ProvenanceSection', () => {
  const provenance = {
    formulaVersion: 'v1.0.0',
    weights: {
      complexity: 0.2,
      maintainability: 0.35,
      testCoverage: 0.25,
      standardsAdherence: 0.2,
    },
    taskComplexityMultiplier: 1.05,
    domainNormalizationFactor: 1.0,
    modelPromptVersion: 'code-v1',
  };

  it('renders expandable trigger', () => {
    render(<ProvenanceSection provenance={provenance} rubric={null} />);

    expect(screen.getByText('How was this calculated?')).toBeInTheDocument();
  });

  it('expands to show formula version and weights', async () => {
    const user = userEvent.setup();
    render(<ProvenanceSection provenance={provenance} rubric={null} />);

    await user.click(screen.getByText('How was this calculated?'));

    expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    expect(screen.getByText('Maintainability')).toBeInTheDocument();
    expect(screen.getByText('35%')).toBeInTheDocument();
    expect(screen.getByText('1.05x')).toBeInTheDocument();
  });

  it('shows rubric version when present', async () => {
    const user = userEvent.setup();
    const rubric = {
      version: 'v2.1.0',
      parameters: { targetFleschKincaidRange: { min: 30, max: 60 } },
    };

    render(<ProvenanceSection provenance={provenance} rubric={rubric} />);

    await user.click(screen.getByText('How was this calculated?'));

    expect(screen.getByText('v2.1.0')).toBeInTheDocument();
  });

  it('returns null when provenance is null', () => {
    const { container } = render(<ProvenanceSection provenance={null} rubric={null} />);

    expect(container.firstChild).toBeNull();
  });
});

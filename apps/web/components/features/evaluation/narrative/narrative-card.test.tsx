import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NarrativeCard } from './narrative-card';

describe('NarrativeCard', () => {
  const defaultProps = {
    narrative:
      'Your refactoring reduced complexity significantly. The approach was systematic and well-tested.',
    contributionTitle: 'Refactor auth module',
    contributionType: 'COMMIT',
    sourceRef: 'abc123def',
    completedAt: '2026-03-01T12:00:00.000Z',
  };

  it('renders narrative text in serif typography', () => {
    render(<NarrativeCard {...defaultProps} />);

    const narrative = screen.getByText(/Your refactoring reduced complexity/);
    expect(narrative).toBeInTheDocument();
    expect(narrative.className).toContain('font-serif');
  });

  it('shows contribution metadata', () => {
    render(<NarrativeCard {...defaultProps} />);

    expect(screen.getByText('Refactor auth module')).toBeInTheDocument();
    expect(screen.getByText('abc123def')).toBeInTheDocument();
    expect(screen.getByText('Commit')).toBeInTheDocument();
  });

  it('displays formatted date', () => {
    render(<NarrativeCard {...defaultProps} />);

    expect(screen.getByText('March 1, 2026')).toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    render(<NarrativeCard {...defaultProps} />);

    expect(screen.getByRole('article')).toHaveAttribute(
      'aria-label',
      'AI evaluation for Refactor auth module',
    );
  });

  it('handles null narrative gracefully', () => {
    render(<NarrativeCard {...defaultProps} narrative={null} />);

    expect(screen.getByText('Evaluation narrative is not available.')).toBeInTheDocument();
  });

  it('maps PULL_REQUEST type to readable label', () => {
    render(<NarrativeCard {...defaultProps} contributionType="PULL_REQUEST" />);

    expect(screen.getByText('Pull Request')).toBeInTheDocument();
  });

  it('maps DOCUMENTATION type to readable label', () => {
    render(<NarrativeCard {...defaultProps} contributionType="DOCUMENTATION" />);

    expect(screen.getByText('Documentation')).toBeInTheDocument();
  });
});

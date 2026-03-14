import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusIndicator } from './status-indicator';

describe('StatusIndicator', () => {
  it('renders message', () => {
    render(<StatusIndicator state="processing" message="Your contribution is being analyzed" />);
    expect(screen.getByText('Your contribution is being analyzed')).toBeDefined();
  });

  it('has role="status" for ARIA', () => {
    render(<StatusIndicator state="processing" message="Analyzing" />);
    expect(screen.getByRole('status')).toBeDefined();
  });

  it('has aria-live="polite" for screen reader announcements', () => {
    render(<StatusIndicator state="processing" message="Analyzing" />);
    const el = screen.getByRole('status');
    expect(el.getAttribute('aria-live')).toBe('polite');
  });

  it('shows spinner for processing state', () => {
    const { container } = render(<StatusIndicator state="processing" message="Processing" />);
    const spinner = container.querySelector('svg');
    expect(spinner).not.toBeNull();
    expect(spinner?.getAttribute('class')).toContain('animate-spin');
  });

  it('respects prefers-reduced-motion on spinner', () => {
    const { container } = render(<StatusIndicator state="processing" message="Processing" />);
    const spinner = container.querySelector('svg');
    expect(spinner?.getAttribute('class')).toContain('motion-reduce:animate-none');
  });

  it('does not show spinner for completed state', () => {
    const { container } = render(<StatusIndicator state="completed" message="Done" />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('applies text-secondary for processing', () => {
    render(<StatusIndicator state="processing" message="Msg" />);
    expect(screen.getByRole('status').className).toContain('text-text-secondary');
  });

  it('applies text-success for completed', () => {
    render(<StatusIndicator state="completed" message="Msg" />);
    expect(screen.getByRole('status').className).toContain('text-success');
  });

  it('applies text-warning for needs-attention', () => {
    render(<StatusIndicator state="needs-attention" message="Msg" />);
    expect(screen.getByRole('status').className).toContain('text-warning');
  });

  it('merges custom className', () => {
    render(<StatusIndicator state="processing" message="Msg" className="custom" />);
    expect(screen.getByRole('status').className).toContain('custom');
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AutoSaveIndicator } from './auto-save-indicator';

describe('AutoSaveIndicator', () => {
  it('shows nothing when idle', () => {
    const { container } = render(<AutoSaveIndicator status="idle" />);
    expect(container.textContent).toBe('');
  });

  it('shows "Saving..." when saving', () => {
    render(<AutoSaveIndicator status="saving" />);
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('shows "Saved" when saved', () => {
    render(<AutoSaveIndicator status="saved" />);
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('shows "Save failed" on error', () => {
    render(<AutoSaveIndicator status="error" />);
    expect(screen.getByText('Save failed')).toBeInTheDocument();
  });

  it('hides "Saved" after 3 seconds', async () => {
    vi.useFakeTimers();
    render(<AutoSaveIndicator status="saved" />);

    expect(screen.getByText('Saved')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});

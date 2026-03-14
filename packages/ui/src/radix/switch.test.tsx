import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Switch } from './switch';

describe('Switch', () => {
  it('renders with switch role', () => {
    render(<Switch />);
    expect(screen.getByRole('switch')).toBeDefined();
  });

  it('applies surface-subtle when unchecked', () => {
    render(<Switch />);
    const sw = screen.getByRole('switch');
    expect(sw.className).toContain('data-[state=unchecked]:bg-surface-subtle');
  });

  it('applies accent-primary when checked', () => {
    render(<Switch />);
    const sw = screen.getByRole('switch');
    expect(sw.className).toContain('data-[state=checked]:bg-accent-primary');
  });

  it('toggles on click', async () => {
    const user = userEvent.setup();
    render(<Switch />);
    const sw = screen.getByRole('switch');
    expect(sw.getAttribute('data-state')).toBe('unchecked');
    await user.click(sw);
    expect(sw.getAttribute('data-state')).toBe('checked');
  });

  it('has focus-visible ring', () => {
    render(<Switch />);
    const sw = screen.getByRole('switch');
    expect(sw.className).toContain('focus-visible:ring-accent-primary');
  });

  it('has minimum touch target', () => {
    render(<Switch />);
    const sw = screen.getByRole('switch');
    expect(sw.className).toContain('min-h-[44px]');
    expect(sw.className).toContain('min-w-[44px]');
  });

  it('supports disabled state', () => {
    render(<Switch disabled />);
    const sw = screen.getByRole('switch');
    expect(sw.className).toContain('disabled:opacity-40');
  });

  it('merges custom className', () => {
    render(<Switch className="custom-switch" />);
    const sw = screen.getByRole('switch');
    expect(sw.className).toContain('custom-switch');
  });
});

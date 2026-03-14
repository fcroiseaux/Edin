import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Input } from './input';

describe('Input', () => {
  it('renders an input element', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).toBeDefined();
  });

  it('renders label when provided', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeDefined();
  });

  it('does not set aria-describedby when no error', () => {
    render(<Input />);
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-describedby');
  });

  it('applies surface-raised background', () => {
    render(<Input />);
    expect(screen.getByRole('textbox').className).toContain('bg-surface-raised');
  });

  it('shows error message when error is provided', () => {
    render(<Input error="Required field" />);
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Required field')).toBeDefined();
  });

  it('sets aria-invalid when error is provided', () => {
    render(<Input error="Required" />);
    expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBe('true');
  });

  it('links error message via aria-describedby', () => {
    render(<Input error="Bad input" />);
    const input = screen.getByRole('textbox');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const errorEl = document.getElementById(describedBy!);
    expect(errorEl?.textContent).toBe('Bad input');
  });

  it('applies error border styles', () => {
    render(<Input error="Error" />);
    expect(screen.getByRole('textbox').className).toContain('border-error');
  });

  it('accepts user input', async () => {
    const user = userEvent.setup();
    render(<Input />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'hello');
    expect(input).toHaveValue('hello');
  });

  it('forwards ref', () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('merges custom className', () => {
    render(<Input className="custom" />);
    expect(screen.getByRole('textbox').className).toContain('custom');
  });
});

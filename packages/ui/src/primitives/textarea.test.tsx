import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Textarea } from './textarea';

describe('Textarea', () => {
  it('renders a textarea element', () => {
    render(<Textarea />);
    expect(screen.getByRole('textbox')).toBeDefined();
  });

  it('renders label when provided', () => {
    render(<Textarea label="Description" />);
    expect(screen.getByLabelText('Description')).toBeDefined();
  });

  it('does not set aria-describedby when no error', () => {
    render(<Textarea />);
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-describedby');
  });

  it('applies surface-raised background', () => {
    render(<Textarea />);
    expect(screen.getByRole('textbox').className).toContain('bg-surface-raised');
  });

  it('shows error message when error is provided', () => {
    render(<Textarea error="Too short" />);
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Too short')).toBeDefined();
  });

  it('sets aria-invalid when error is provided', () => {
    render(<Textarea error="Error" />);
    expect(screen.getByRole('textbox').getAttribute('aria-invalid')).toBe('true');
  });

  it('links error via aria-describedby', () => {
    render(<Textarea error="Required" />);
    const textarea = screen.getByRole('textbox');
    const describedBy = textarea.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const errorEl = document.getElementById(describedBy!);
    expect(errorEl?.textContent).toBe('Required');
  });

  it('accepts user input', async () => {
    const user = userEvent.setup();
    render(<Textarea />);
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'text content');
    expect(textarea).toHaveValue('text content');
  });

  it('forwards ref', () => {
    const ref = { current: null as HTMLTextAreaElement | null };
    render(<Textarea ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });
});

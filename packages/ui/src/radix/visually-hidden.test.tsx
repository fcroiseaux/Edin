import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VisuallyHidden } from './visually-hidden';

describe('VisuallyHidden', () => {
  it('renders children', () => {
    render(<VisuallyHidden>Hidden label</VisuallyHidden>);
    expect(screen.getByText('Hidden label')).toBeDefined();
  });

  it('is visually hidden but accessible', () => {
    render(<VisuallyHidden>Screen reader text</VisuallyHidden>);
    const el = screen.getByText('Screen reader text');
    // Radix VisuallyHidden uses clip/position styling to hide visually
    expect(el.style.position).toBe('absolute');
  });

  it('renders as span by default', () => {
    render(<VisuallyHidden>Text</VisuallyHidden>);
    const el = screen.getByText('Text');
    expect(el.tagName).toBe('SPAN');
  });
});

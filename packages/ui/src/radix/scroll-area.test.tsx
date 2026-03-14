import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ScrollArea } from './scroll-area';

describe('ScrollArea', () => {
  it('renders children', () => {
    render(
      <ScrollArea data-testid="scroll">
        <p>Scrollable content</p>
      </ScrollArea>,
    );
    expect(screen.getByText('Scrollable content')).toBeDefined();
  });

  it('applies overflow-hidden on root', () => {
    render(
      <ScrollArea data-testid="scroll">
        <p>Content</p>
      </ScrollArea>,
    );
    expect(screen.getByTestId('scroll').className).toContain('overflow-hidden');
  });

  it('merges custom className', () => {
    render(
      <ScrollArea data-testid="scroll" className="h-64">
        <p>Content</p>
      </ScrollArea>,
    );
    expect(screen.getByTestId('scroll').className).toContain('h-64');
  });

  it('renders ScrollBar component without error', () => {
    // ScrollBar renders as part of ScrollArea; Radix may hide scrollbar
    // when there's no overflow. We verify the component structure renders.
    render(
      <ScrollArea data-testid="scroll">
        <p>Content</p>
      </ScrollArea>,
    );
    const root = screen.getByTestId('scroll');
    // Verify the viewport child exists
    expect(root.querySelector('[data-radix-scroll-area-viewport]')).not.toBeNull();
  });
});

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

function renderSelect() {
  return render(
    <Select>
      <SelectTrigger data-testid="trigger">
        <SelectValue placeholder="Pick one" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="a">Alpha</SelectItem>
        <SelectItem value="b">Beta</SelectItem>
      </SelectContent>
    </Select>,
  );
}

describe('Select', () => {
  it('renders trigger', () => {
    renderSelect();
    expect(screen.getByTestId('trigger')).toBeDefined();
  });

  it('applies surface-raised background on trigger', () => {
    renderSelect();
    expect(screen.getByTestId('trigger').className).toContain('bg-surface-raised');
  });

  it('applies border-surface-subtle on trigger', () => {
    renderSelect();
    expect(screen.getByTestId('trigger').className).toContain('border-surface-subtle');
  });

  it('applies focus-visible ring on trigger', () => {
    renderSelect();
    expect(screen.getByTestId('trigger').className).toContain('focus-visible:ring-accent-primary');
  });

  it('has combobox role on trigger', () => {
    renderSelect();
    expect(screen.getByRole('combobox')).toBeDefined();
  });

  it('renders chevron icon with aria-hidden', () => {
    renderSelect();
    const trigger = screen.getByTestId('trigger');
    const svg = trigger.querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders placeholder text', () => {
    renderSelect();
    expect(screen.getByText('Pick one')).toBeDefined();
  });
});

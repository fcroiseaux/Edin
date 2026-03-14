import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';

function renderDropdown() {
  return render(
    <DropdownMenu>
      <DropdownMenuTrigger>Actions</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Edit</DropdownMenuItem>
        <DropdownMenuItem>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>,
  );
}

describe('DropdownMenu', () => {
  it('renders trigger', () => {
    renderDropdown();
    expect(screen.getByText('Actions')).toBeDefined();
  });

  it('opens on trigger click', async () => {
    const user = userEvent.setup();
    renderDropdown();
    await user.click(screen.getByText('Actions'));
    expect(screen.getByText('Edit')).toBeDefined();
    expect(screen.getByText('Delete')).toBeDefined();
  });

  it('applies surface-raised background on content', async () => {
    const user = userEvent.setup();
    renderDropdown();
    await user.click(screen.getByText('Actions'));
    const content = screen.getByRole('menu');
    expect(content.className).toContain('bg-surface-raised');
  });

  it('applies shadow-lg on content', async () => {
    const user = userEvent.setup();
    renderDropdown();
    await user.click(screen.getByText('Actions'));
    const content = screen.getByRole('menu');
    expect(content.className).toContain('shadow-lg');
  });

  it('applies focus styles on menu items', async () => {
    const user = userEvent.setup();
    renderDropdown();
    await user.click(screen.getByText('Actions'));
    const item = screen.getByText('Edit');
    expect(item.className).toContain('focus:bg-accent-primary');
  });

  it('renders label with text-secondary', async () => {
    const user = userEvent.setup();
    renderDropdown();
    await user.click(screen.getByText('Actions'));
    const label = screen.getByText('Options');
    expect(label.className).toContain('text-text-secondary');
  });

  it('renders separator with surface-subtle', async () => {
    const user = userEvent.setup();
    renderDropdown();
    await user.click(screen.getByText('Actions'));
    const separator = screen.getByRole('separator');
    expect(separator.className).toContain('bg-surface-subtle');
  });

  it('has menu role', async () => {
    const user = userEvent.setup();
    renderDropdown();
    await user.click(screen.getByText('Actions'));
    expect(screen.getByRole('menu')).toBeDefined();
  });
});

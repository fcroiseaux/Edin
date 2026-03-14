import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './dialog';

function renderDialog() {
  return render(
    <Dialog>
      <DialogTrigger>Open</DialogTrigger>
      <DialogContent>
        <DialogTitle>Title</DialogTitle>
        <DialogDescription>Description</DialogDescription>
        <DialogClose>Close</DialogClose>
      </DialogContent>
    </Dialog>,
  );
}

describe('Dialog', () => {
  it('renders trigger', () => {
    renderDialog();
    expect(screen.getByText('Open')).toBeDefined();
  });

  it('opens on trigger click', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByText('Open'));
    expect(screen.getByText('Title')).toBeDefined();
    expect(screen.getByText('Description')).toBeDefined();
  });

  it('applies surface-overlay background on content', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByText('Open'));
    const content = screen.getByRole('dialog');
    expect(content.className).toContain('bg-surface-overlay');
  });

  it('applies shadow-lg on content', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByText('Open'));
    const content = screen.getByRole('dialog');
    expect(content.className).toContain('shadow-lg');
  });

  it('applies rounded-lg on content', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByText('Open'));
    const content = screen.getByRole('dialog');
    expect(content.className).toContain('rounded-lg');
  });

  it('applies blush-pink to title', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByText('Open'));
    const title = screen.getByText('Title');
    expect(title.className).toContain('text-text-heading');
  });

  it('applies text-secondary to description', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByText('Open'));
    const desc = screen.getByText('Description');
    expect(desc.className).toContain('text-text-secondary');
  });

  it('has dialog role', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByText('Open'));
    expect(screen.getByRole('dialog')).toBeDefined();
  });
});

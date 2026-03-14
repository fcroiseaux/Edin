import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

describe('Popover', () => {
  it('renders trigger', () => {
    render(
      <Popover>
        <PopoverTrigger>Info</PopoverTrigger>
        <PopoverContent>Details here</PopoverContent>
      </Popover>,
    );
    expect(screen.getByText('Info')).toBeDefined();
  });

  it('opens on trigger click', async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>Info</PopoverTrigger>
        <PopoverContent>Details here</PopoverContent>
      </Popover>,
    );
    await user.click(screen.getByText('Info'));
    expect(screen.getByText('Details here')).toBeDefined();
  });

  it('applies surface-raised background', async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>Info</PopoverTrigger>
        <PopoverContent data-testid="content">Content</PopoverContent>
      </Popover>,
    );
    await user.click(screen.getByText('Info'));
    const content = screen.getByTestId('content');
    expect(content.className).toContain('bg-surface-raised');
  });

  it('applies shadow-lg', async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>Info</PopoverTrigger>
        <PopoverContent data-testid="content">Content</PopoverContent>
      </Popover>,
    );
    await user.click(screen.getByText('Info'));
    expect(screen.getByTestId('content').className).toContain('shadow-lg');
  });

  it('applies default border without domain', async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>Info</PopoverTrigger>
        <PopoverContent data-testid="content">Content</PopoverContent>
      </Popover>,
    );
    await user.click(screen.getByText('Info'));
    expect(screen.getByTestId('content').className).toContain('border-surface-subtle');
  });

  it('applies pillar-color border with domain prop', async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>Info</PopoverTrigger>
        <PopoverContent data-testid="content" domain="tech">
          Content
        </PopoverContent>
      </Popover>,
    );
    await user.click(screen.getByText('Info'));
    expect(screen.getByTestId('content').className).toContain('border-pillar-tech');
  });

  it('merges custom className', async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>Info</PopoverTrigger>
        <PopoverContent data-testid="content" className="custom-popover">
          Content
        </PopoverContent>
      </Popover>,
    );
    await user.click(screen.getByText('Info'));
    expect(screen.getByTestId('content').className).toContain('custom-popover');
  });
});

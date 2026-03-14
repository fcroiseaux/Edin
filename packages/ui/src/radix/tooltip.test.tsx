import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

function renderTooltip() {
  return render(
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>Tooltip text</TooltipContent>
      </Tooltip>
    </TooltipProvider>,
  );
}

describe('Tooltip', () => {
  it('renders trigger', () => {
    renderTooltip();
    expect(screen.getByText('Hover me')).toBeDefined();
  });

  it('shows content on hover', async () => {
    const user = userEvent.setup();
    renderTooltip();
    await user.hover(screen.getByText('Hover me'));
    // Radix renders tooltip text in both the content div and a visually-hidden span
    const elements = await screen.findAllByText('Tooltip text');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('applies surface-overlay background', async () => {
    const user = userEvent.setup();
    renderTooltip();
    await user.hover(screen.getByText('Hover me'));
    const elements = await screen.findAllByText('Tooltip text');
    // The styled content is the one with className
    const styled = elements.find((el) => el.className.includes('bg-surface-overlay'));
    expect(styled).toBeDefined();
  });

  it('applies shadow-md', async () => {
    const user = userEvent.setup();
    renderTooltip();
    await user.hover(screen.getByText('Hover me'));
    const elements = await screen.findAllByText('Tooltip text');
    const styled = elements.find((el) => el.className.includes('shadow-md'));
    expect(styled).toBeDefined();
  });

  it('applies rounded-sm', async () => {
    const user = userEvent.setup();
    renderTooltip();
    await user.hover(screen.getByText('Hover me'));
    const elements = await screen.findAllByText('Tooltip text');
    const styled = elements.find((el) => el.className.includes('rounded-sm'));
    expect(styled).toBeDefined();
  });

  it('has tooltip role', async () => {
    const user = userEvent.setup();
    renderTooltip();
    await user.hover(screen.getByText('Hover me'));
    expect(await screen.findByRole('tooltip')).toBeDefined();
  });
});

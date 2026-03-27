import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EditionChannelDto } from '@edin/shared';
import { ChannelFilter } from '../channel-filter';

const mockChannels: EditionChannelDto[] = [
  { channelId: 'ch-1', channelName: 'Technology', channelType: 'DOMAIN', itemCount: 3 },
  { channelId: 'ch-2', channelName: 'Governance', channelType: 'DOMAIN', itemCount: 2 },
  { channelId: 'ch-3', channelName: 'Finance', channelType: 'DOMAIN', itemCount: 0 },
];

describe('ChannelFilter', () => {
  it('renders all channels with item counts', () => {
    const onFilterChange = vi.fn();
    render(
      <ChannelFilter
        channels={mockChannels}
        selectedChannelIds={[]}
        onFilterChange={onFilterChange}
      />,
    );

    expect(screen.getByText('All Channels')).toBeDefined();
    expect(screen.getByText(/Technology/)).toBeDefined();
    expect(screen.getByText(/Governance/)).toBeDefined();
    expect(screen.getByText(/Finance/)).toBeDefined();

    // Item counts
    expect(screen.getByText('(3)')).toBeDefined();
    expect(screen.getByText('(2)')).toBeDefined();
    expect(screen.getByText('(0)')).toBeDefined();
  });

  it('zero-item channels are visually muted and not clickable', () => {
    const onFilterChange = vi.fn();
    render(
      <ChannelFilter
        channels={mockChannels}
        selectedChannelIds={[]}
        onFilterChange={onFilterChange}
      />,
    );

    // Finance has 0 items — rendered as a span, not a button
    const financeElement = screen.getByText('Finance').closest('[aria-disabled]');
    expect(financeElement).toBeDefined();
    expect(financeElement?.getAttribute('aria-disabled')).toBe('true');
  });

  it('clicking a channel calls onFilterChange with that channel ID', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(
      <ChannelFilter
        channels={mockChannels}
        selectedChannelIds={[]}
        onFilterChange={onFilterChange}
      />,
    );

    const techButton = screen.getByRole('button', { name: /Technology/ });
    await user.click(techButton);

    expect(onFilterChange).toHaveBeenCalledWith(['ch-1']);
  });

  it('clicking a selected channel deselects it', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(
      <ChannelFilter
        channels={mockChannels}
        selectedChannelIds={['ch-1']}
        onFilterChange={onFilterChange}
      />,
    );

    const techButton = screen.getByRole('button', { name: /Technology/ });
    await user.click(techButton);

    // Should remove ch-1 from selection
    expect(onFilterChange).toHaveBeenCalledWith([]);
  });

  it('"All Channels" button clears all selections', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(
      <ChannelFilter
        channels={mockChannels}
        selectedChannelIds={['ch-1', 'ch-2']}
        onFilterChange={onFilterChange}
      />,
    );

    const allButton = screen.getByRole('button', { name: 'All Channels' });
    await user.click(allButton);

    expect(onFilterChange).toHaveBeenCalledWith([]);
  });

  it('multiple channels can be selected simultaneously', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    render(
      <ChannelFilter
        channels={mockChannels}
        selectedChannelIds={['ch-1']}
        onFilterChange={onFilterChange}
      />,
    );

    const govButton = screen.getByRole('button', { name: /Governance/ });
    await user.click(govButton);

    // Should add ch-2 to existing selection of ch-1
    expect(onFilterChange).toHaveBeenCalledWith(['ch-1', 'ch-2']);
  });

  it('All Channels button shows selected state when no filters active', () => {
    const onFilterChange = vi.fn();
    render(
      <ChannelFilter
        channels={mockChannels}
        selectedChannelIds={[]}
        onFilterChange={onFilterChange}
      />,
    );

    const allButton = screen.getByRole('button', { name: 'All Channels' });
    expect(allButton.getAttribute('aria-pressed')).toBe('true');
  });

  it('channel buttons show selected state when active', () => {
    const onFilterChange = vi.fn();
    render(
      <ChannelFilter
        channels={mockChannels}
        selectedChannelIds={['ch-1']}
        onFilterChange={onFilterChange}
      />,
    );

    const techButton = screen.getByRole('button', { name: /Technology/ });
    expect(techButton.getAttribute('aria-pressed')).toBe('true');

    const govButton = screen.getByRole('button', { name: /Governance/ });
    expect(govButton.getAttribute('aria-pressed')).toBe('false');
  });
});

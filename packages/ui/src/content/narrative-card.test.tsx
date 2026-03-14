import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NarrativeCard } from './narrative-card';

describe('NarrativeCard', () => {
  it('renders title and narrative', () => {
    render(
      <NarrativeCard domain="tech" title="Code Review" narrative="High quality contribution" />,
    );
    expect(screen.getByText('Code Review')).toBeDefined();
    expect(screen.getByText('High quality contribution')).toBeDefined();
  });

  it('renders PillarAccentLine', () => {
    const { container } = render(<NarrativeCard domain="tech" title="Title" narrative="Text" />);
    const accentLine = container.querySelector('[aria-hidden="true"]');
    expect(accentLine?.className).toContain('bg-pillar-tech');
  });

  it('renders DomainBadge', () => {
    render(<NarrativeCard domain="impact" title="Title" narrative="Text" />);
    expect(screen.getByText('impact')).toBeDefined();
  });

  it('applies surface-raised background', () => {
    const { container } = render(<NarrativeCard domain="tech" title="Title" narrative="Text" />);
    expect(container.firstElementChild?.className).toContain('bg-surface-raised');
  });

  it('has hover state with border/shadow shift', () => {
    const { container } = render(<NarrativeCard domain="tech" title="Title" narrative="Text" />);
    expect(container.firstElementChild?.className).toContain('hover:shadow-md');
  });

  it('renders metadata when provided', () => {
    render(
      <NarrativeCard
        domain="tech"
        title="Title"
        narrative="Text"
        metadata={<span>2 days ago</span>}
      />,
    );
    expect(screen.getByText('2 days ago')).toBeDefined();
  });

  it('renders evaluation variant with accordion', async () => {
    const user = userEvent.setup();
    render(
      <NarrativeCard
        domain="tech"
        title="Title"
        narrative="Text"
        variant="evaluation"
        expandedContent={<div>Detailed metrics</div>}
      />,
    );
    expect(screen.getByText('See detail')).toBeDefined();
    await user.click(screen.getByText('See detail'));
    expect(screen.getByText('Detailed metrics')).toBeDefined();
  });

  it('renders feedback variant with actions', () => {
    render(
      <NarrativeCard
        domain="tech"
        title="Title"
        narrative="Text"
        variant="feedback"
        actions={<button>Resolve</button>}
      />,
    );
    expect(screen.getByText('Resolve')).toBeDefined();
  });

  it('is clickable when onClick is provided', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <NarrativeCard
        domain="tech"
        title="Title"
        narrative="Text"
        onClick={onClick}
        aria-label="View details"
      />,
    );
    await user.click(screen.getByLabelText('View details'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('supports keyboard activation when onClick provided', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <NarrativeCard
        domain="tech"
        title="Title"
        narrative="Text"
        onClick={onClick}
        aria-label="View"
      />,
    );
    const card = screen.getByLabelText('View');
    card.focus();
    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('merges custom className', () => {
    const { container } = render(
      <NarrativeCard domain="tech" title="Title" narrative="Text" className="custom-card" />,
    );
    expect(container.firstElementChild?.className).toContain('custom-card');
  });
});

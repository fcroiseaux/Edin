import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardShell } from './dashboard-shell';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

describe('DashboardShell', () => {
  it('renders sidebar and main content', () => {
    render(
      <DashboardShell sidebar={<div>Sidebar Content</div>}>
        <div>Main Content</div>
      </DashboardShell>,
    );
    expect(screen.getByText('Sidebar Content')).toBeDefined();
    expect(screen.getByText('Main Content')).toBeDefined();
  });

  it('renders skip-to-content link', () => {
    render(
      <DashboardShell sidebar={<div>Nav</div>}>
        <div>Content</div>
      </DashboardShell>,
    );
    const skipLink = screen.getByText('Skip to content');
    expect(skipLink).toBeDefined();
    expect(skipLink.getAttribute('href')).toBe('#main-content');
  });

  it('renders main landmark with correct id', () => {
    render(
      <DashboardShell sidebar={<div>Nav</div>}>
        <div>Content</div>
      </DashboardShell>,
    );
    const main = screen.getByRole('main');
    expect(main).toBeDefined();
    expect(main.id).toBe('main-content');
  });

  it('renders navigation landmark', () => {
    render(
      <DashboardShell sidebar={<div>Nav</div>}>
        <div>Content</div>
      </DashboardShell>,
    );
    const navs = screen.getAllByRole('navigation');
    expect(navs.length).toBeGreaterThanOrEqual(1);
    const sidebarNav = navs.find((n) => n.getAttribute('aria-label') === 'Sidebar navigation');
    expect(sidebarNav).toBeDefined();
  });

  it('applies surface-raised on sidebar', () => {
    render(
      <DashboardShell sidebar={<div>Nav</div>}>
        <div>Content</div>
      </DashboardShell>,
    );
    const aside = document.querySelector('aside');
    expect(aside?.className).toContain('bg-surface-raised');
  });

  it('applies surface-base on main content', () => {
    render(
      <DashboardShell sidebar={<div>Nav</div>}>
        <div>Content</div>
      </DashboardShell>,
    );
    const main = screen.getByRole('main');
    expect(main.className).toContain('bg-surface-base');
  });

  it('renders collapse button with label', () => {
    render(
      <DashboardShell sidebar={<div>Nav</div>}>
        <div>Content</div>
      </DashboardShell>,
    );
    const collapseBtn = screen.getByLabelText('Collapse sidebar');
    expect(collapseBtn).toBeDefined();
  });

  it('toggles collapse state on button click', async () => {
    const user = userEvent.setup();
    const onCollapse = vi.fn();
    render(
      <DashboardShell sidebar={<div>Nav</div>} onCollapseChange={onCollapse}>
        <div>Content</div>
      </DashboardShell>,
    );
    const collapseBtn = screen.getByLabelText('Collapse sidebar');
    await user.click(collapseBtn);
    expect(onCollapse).toHaveBeenCalledWith(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('edin-sidebar-collapsed', 'true');
  });

  it('starts collapsed when defaultCollapsed is true', () => {
    render(
      <DashboardShell sidebar={<div>Nav</div>} defaultCollapsed>
        <div>Content</div>
      </DashboardShell>,
    );
    const aside = document.querySelector('aside');
    expect(aside?.className).toContain('md:w-16');
  });

  it('has transition classes for smooth collapse', () => {
    render(
      <DashboardShell sidebar={<div>Nav</div>}>
        <div>Content</div>
      </DashboardShell>,
    );
    const aside = document.querySelector('aside');
    expect(aside?.className).toContain('transition-[width]');
    expect(aside?.className).toContain('duration-200');
    expect(aside?.className).toContain('ease-out');
  });

  it('has motion-reduce transition override', () => {
    render(
      <DashboardShell sidebar={<div>Nav</div>}>
        <div>Content</div>
      </DashboardShell>,
    );
    const aside = document.querySelector('aside');
    expect(aside?.className).toContain('motion-reduce:transition-none');
  });

  it('renders hamburger button for mobile', () => {
    render(
      <DashboardShell sidebar={<div>Nav</div>}>
        <div>Content</div>
      </DashboardShell>,
    );
    const hamburger = screen.getByLabelText('Open navigation');
    expect(hamburger).toBeDefined();
  });

  it('opens mobile overlay on hamburger click', async () => {
    const user = userEvent.setup();
    render(
      <DashboardShell sidebar={<div>Mobile Nav</div>}>
        <div>Content</div>
      </DashboardShell>,
    );
    await user.click(screen.getByLabelText('Open navigation'));
    const closeBtn = screen.getByLabelText('Close navigation');
    expect(closeBtn).toBeDefined();
  });

  it('closes mobile overlay on close button click', async () => {
    const user = userEvent.setup();
    render(
      <DashboardShell sidebar={<div>Nav</div>}>
        <div>Content</div>
      </DashboardShell>,
    );
    await user.click(screen.getByLabelText('Open navigation'));
    await user.click(screen.getByLabelText('Close navigation'));
    expect(screen.queryByLabelText('Close navigation')).toBeNull();
  });

  it('closes mobile overlay on escape key', async () => {
    const user = userEvent.setup();
    render(
      <DashboardShell sidebar={<div>Nav</div>}>
        <div>Content</div>
      </DashboardShell>,
    );
    await user.click(screen.getByLabelText('Open navigation'));
    expect(screen.getByLabelText('Close navigation')).toBeDefined();
    await user.keyboard('{Escape}');
    expect(screen.queryByLabelText('Close navigation')).toBeNull();
  });

  it('reads collapse state from localStorage on mount', async () => {
    localStorageMock.getItem.mockReturnValueOnce('true');
    render(
      <DashboardShell sidebar={<div>Nav</div>}>
        <div>Content</div>
      </DashboardShell>,
    );
    // After mount effect, sidebar should be collapsed
    await vi.waitFor(() => {
      const aside = document.querySelector('aside');
      expect(aside?.className).toContain('md:w-16');
    });
  });

  it('mobile overlay has dialog role', async () => {
    const user = userEvent.setup();
    render(
      <DashboardShell sidebar={<div>Nav</div>}>
        <div>Content</div>
      </DashboardShell>,
    );
    await user.click(screen.getByLabelText('Open navigation'));
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('merges custom className', () => {
    const { container } = render(
      <DashboardShell sidebar={<div>Nav</div>} className="custom-shell">
        <div>Content</div>
      </DashboardShell>,
    );
    expect(container.firstElementChild?.className).toContain('custom-shell');
  });
});

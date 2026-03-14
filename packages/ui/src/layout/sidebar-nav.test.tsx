import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SidebarNav, type NavSection } from './sidebar-nav';

const sections: NavSection[] = [
  {
    title: 'Main',
    items: [
      { href: '/dashboard', label: 'Overview', isActive: true },
      { href: '/contributions', label: 'Contributions' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { href: '/evaluations', label: 'Evaluations', domain: 'tech' as const },
      {
        href: '/feedback',
        label: 'Feedback',
        hasNotification: true,
      },
    ],
  },
];

function renderNav(overrides?: Partial<React.ComponentProps<typeof SidebarNav>>) {
  return render(
    <SidebarNav
      logo={<span data-testid="logo">Edin</span>}
      subtitle="Dashboard"
      sections={sections}
      {...overrides}
    />,
  );
}

describe('SidebarNav', () => {
  it('renders logo', () => {
    renderNav();
    expect(screen.getByTestId('logo')).toBeDefined();
  });

  it('renders subtitle', () => {
    renderNav();
    expect(screen.getByText('Dashboard')).toBeDefined();
  });

  it('renders section titles', () => {
    renderNav();
    expect(screen.getByText('Main')).toBeDefined();
    expect(screen.getByText('Tools')).toBeDefined();
  });

  it('renders nav item labels', () => {
    renderNav();
    expect(screen.getByText('Overview')).toBeDefined();
    expect(screen.getByText('Contributions')).toBeDefined();
    expect(screen.getByText('Evaluations')).toBeDefined();
    expect(screen.getByText('Feedback')).toBeDefined();
  });

  it('applies active styling to active item', () => {
    renderNav();
    const activeLink = screen.getByText('Overview').closest('a');
    expect(activeLink?.className).toContain('bg-accent-primary/8');
    expect(activeLink?.className).toContain('text-accent-primary');
    expect(activeLink?.className).toContain('border-accent-primary');
    expect(activeLink?.className).toContain('border-r-2');
  });

  it('sets aria-current on active item', () => {
    renderNav();
    const activeLink = screen.getByText('Overview').closest('a');
    expect(activeLink?.getAttribute('aria-current')).toBe('page');
  });

  it('does not set aria-current on inactive items', () => {
    renderNav();
    const inactiveLink = screen.getByText('Contributions').closest('a');
    expect(inactiveLink?.getAttribute('aria-current')).toBeNull();
  });

  it('renders domain pillar-color dot', () => {
    renderNav();
    const evalLink = screen.getByText('Evaluations').closest('a');
    const dot = evalLink?.querySelector('[aria-hidden="true"]');
    expect(dot?.className).toContain('bg-pillar-tech');
  });

  it('renders notification dot', () => {
    renderNav();
    const feedbackLink = screen.getByText('Feedback').closest('a');
    const dots = feedbackLink?.querySelectorAll('[aria-hidden="true"]');
    const notifDot = Array.from(dots ?? []).find((d) => d.className.includes('bg-accent-primary'));
    expect(notifDot).toBeDefined();
    expect(notifDot?.className).toContain('h-1.5');
    expect(notifDot?.className).toContain('w-1.5');
  });

  it('announces notification in aria-label with item name', () => {
    renderNav();
    const feedbackLink = screen.getByText('Feedback').closest('a');
    expect(feedbackLink?.getAttribute('aria-label')).toBe('Feedback, new updates available');
  });

  it('applies hover styling on inactive items', () => {
    renderNav();
    const inactiveLink = screen.getByText('Contributions').closest('a');
    expect(inactiveLink?.className).toContain('hover:bg-surface-subtle');
  });

  it('applies focus-visible ring', () => {
    renderNav();
    const link = screen.getByText('Overview').closest('a');
    expect(link?.className).toContain('focus-visible:ring-accent-primary');
  });

  it('hides subtitle when collapsed', () => {
    renderNav({ collapsed: true });
    expect(screen.queryByText('Dashboard')).toBeNull();
  });

  it('hides section titles when collapsed', () => {
    renderNav({ collapsed: true });
    expect(screen.queryByText('Main')).toBeNull();
    expect(screen.queryByText('Tools')).toBeNull();
  });

  it('hides nav labels when collapsed', () => {
    renderNav({ collapsed: true });
    // Labels should be hidden visually but accessible via aria-label
    const links = screen.getAllByRole('link');
    links.forEach((link) => {
      // When collapsed, the label text is not rendered
      const labelSpan = link.querySelector('span.flex-1');
      expect(labelSpan).toBeNull();
    });
  });

  it('shows domain dot in collapsed mode with absolute positioning', () => {
    renderNav({ collapsed: true });
    // The evaluations item has domain='tech'
    const links = screen.getAllByRole('link');
    const evalLink = links.find((l) => l.getAttribute('aria-label') === 'Evaluations');
    const dots = evalLink?.querySelectorAll('[aria-hidden="true"]');
    const domainDot = Array.from(dots ?? []).find((d) => d.className.includes('bg-pillar-tech'));
    expect(domainDot).toBeDefined();
    expect(domainDot?.className).toContain('absolute');
  });

  it('uses renderLink when provided', () => {
    const renderLink = ({
      children,
      ...props
    }: {
      href: string;
      className: string;
      children: React.ReactNode;
      'aria-current'?: 'page';
      'aria-label'?: string;
    }) => (
      <a data-custom-link="true" {...props}>
        {children}
      </a>
    );
    renderNav({ renderLink });
    const links = screen.getAllByRole('link');
    expect(links[0].getAttribute('data-custom-link')).toBe('true');
  });

  it('merges custom className', () => {
    const { container } = renderNav({ className: 'custom-nav' });
    expect(container.firstElementChild?.className).toContain('custom-nav');
  });

  it('renders with icon', () => {
    const sectionsWithIcon: NavSection[] = [
      {
        items: [
          {
            href: '/test',
            label: 'Test',
            icon: <span data-testid="nav-icon">IC</span>,
          },
        ],
      },
    ];
    render(<SidebarNav logo={<span>Logo</span>} sections={sectionsWithIcon} />);
    expect(screen.getByTestId('nav-icon')).toBeDefined();
  });
});

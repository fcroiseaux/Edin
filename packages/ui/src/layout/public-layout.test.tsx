import type React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PublicLayout, type PublicNavItem } from './public-layout';

const navItems: PublicNavItem[] = [
  { href: '/articles', label: 'Publication', isActive: true },
  { href: '/contributors', label: 'Contributors' },
  { href: '/about', label: 'About' },
];

function renderPublicLayout(overrides?: Partial<React.ComponentProps<typeof PublicLayout>>) {
  return render(
    <PublicLayout
      logo={<span data-testid="logo">Edin</span>}
      navItems={navItems}
      authActions={<button>Sign In</button>}
      {...overrides}
    >
      <div>Page content</div>
    </PublicLayout>,
  );
}

describe('PublicLayout', () => {
  it('renders children', () => {
    renderPublicLayout();
    expect(screen.getByText('Page content')).toBeDefined();
  });

  it('renders logo', () => {
    renderPublicLayout();
    const logos = screen.getAllByTestId('logo');
    expect(logos.length).toBeGreaterThanOrEqual(1);
  });

  it('renders nav items', () => {
    renderPublicLayout();
    expect(screen.getByText('Publication')).toBeDefined();
    expect(screen.getByText('Contributors')).toBeDefined();
    expect(screen.getByText('About')).toBeDefined();
  });

  it('applies accent-primary to active nav item', () => {
    renderPublicLayout();
    const activeLink = screen.getByText('Publication').closest('a');
    expect(activeLink?.className).toContain('text-accent-primary');
  });

  it('sets aria-current on active nav item', () => {
    renderPublicLayout();
    const activeLink = screen.getByText('Publication').closest('a');
    expect(activeLink?.getAttribute('aria-current')).toBe('page');
  });

  it('renders auth actions', () => {
    renderPublicLayout();
    expect(screen.getByText('Sign In')).toBeDefined();
  });

  it('has navigation landmark', () => {
    renderPublicLayout();
    const nav = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(nav).toBeDefined();
  });

  it('has main landmark', () => {
    renderPublicLayout();
    expect(screen.getByRole('main')).toBeDefined();
  });

  it('applies surface-base background', () => {
    const { container } = renderPublicLayout();
    expect(container.firstElementChild?.className).toContain('bg-surface-base');
  });

  it('renders hamburger button for mobile', () => {
    renderPublicLayout();
    expect(screen.getByLabelText('Open navigation')).toBeDefined();
  });

  it('opens mobile overlay on hamburger click', async () => {
    const user = userEvent.setup();
    renderPublicLayout();
    await user.click(screen.getByLabelText('Open navigation'));
    expect(screen.getByLabelText('Close navigation')).toBeDefined();
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('closes mobile overlay on close button', async () => {
    const user = userEvent.setup();
    renderPublicLayout();
    await user.click(screen.getByLabelText('Open navigation'));
    await user.click(screen.getByLabelText('Close navigation'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes mobile overlay on escape', async () => {
    const user = userEvent.setup();
    renderPublicLayout();
    await user.click(screen.getByLabelText('Open navigation'));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
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
    }) => (
      <a data-custom="true" {...props}>
        {children}
      </a>
    );
    renderPublicLayout({ renderLink });
    const links = screen.getAllByRole('link');
    expect(links[0].getAttribute('data-custom')).toBe('true');
  });

  it('merges custom className', () => {
    const { container } = renderPublicLayout({ className: 'custom-layout' });
    expect(container.firstElementChild?.className).toContain('custom-layout');
  });
});

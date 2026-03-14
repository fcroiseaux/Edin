import { forwardRef, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface PublicNavItem {
  href: string;
  label: string;
  isActive?: boolean;
}

export interface PublicLayoutProps {
  logo: ReactNode;
  navItems?: PublicNavItem[];
  authActions?: ReactNode;
  renderLink?: (props: {
    href: string;
    className: string;
    children: ReactNode;
    'aria-current'?: 'page';
  }) => ReactNode;
  children: ReactNode;
  className?: string;
}

export const PublicLayout = forwardRef<HTMLDivElement, PublicLayoutProps>(
  ({ logo, navItems = [], authActions, renderLink, children, className }, ref) => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const mobileNavRef = useRef<HTMLDivElement>(null);

    const closeMobile = useCallback(() => setMobileOpen(false), []);

    const renderNavLink = (props: {
      href: string;
      className: string;
      children: ReactNode;
      'aria-current'?: 'page';
    }) => {
      if (renderLink) return renderLink(props);
      const { children: c, ...rest } = props;
      return <a {...rest}>{c}</a>;
    };

    // Escape to close mobile overlay
    useEffect(() => {
      if (!mobileOpen) return;
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') closeMobile();
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [mobileOpen, closeMobile]);

    // Focus trap for mobile overlay
    useEffect(() => {
      if (!mobileOpen || !mobileNavRef.current) return;
      const container = mobileNavRef.current;
      const focusable = container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      first.focus();

      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      container.addEventListener('keydown', handleTab);
      return () => container.removeEventListener('keydown', handleTab);
    }, [mobileOpen]);

    return (
      <div ref={ref} className={cn('min-h-screen bg-surface-base', className)}>
        {/* Desktop navigation */}
        <nav
          className="hidden md:block border-b border-surface-subtle bg-surface-base"
          aria-label="Main navigation"
        >
          <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-3">
            <div className="flex items-center gap-8">
              {logo}
              <ul className="flex items-center gap-6">
                {navItems.map((item) => (
                  <li key={item.href}>
                    {renderNavLink({
                      href: item.href,
                      className: cn(
                        'text-sm font-medium transition-colors',
                        'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-primary rounded-sm',
                        item.isActive
                          ? 'text-accent-primary'
                          : 'text-text-secondary hover:text-text-primary',
                      ),
                      'aria-current': item.isActive ? 'page' : undefined,
                      children: item.label,
                    })}
                  </li>
                ))}
              </ul>
            </div>
            {authActions && <div className="flex items-center gap-4">{authActions}</div>}
          </div>
        </nav>

        {/* Mobile header */}
        <header className="flex h-14 items-center justify-between border-b border-surface-subtle bg-surface-base px-4 md:hidden">
          {logo}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex items-center justify-center rounded-md p-2 text-text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-primary"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="4" x2="20" y1="12" y2="12" />
              <line x1="4" x2="20" y1="6" y2="6" />
              <line x1="4" x2="20" y1="18" y2="18" />
            </svg>
          </button>
        </header>

        {/* Mobile overlay */}
        {mobileOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={closeMobile}
              aria-hidden="true"
            />
            <div
              ref={mobileNavRef}
              className="fixed inset-0 z-50 flex flex-col bg-surface-base md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
            >
              <div className="flex h-14 items-center justify-between border-b border-surface-subtle px-4">
                {logo}
                <button
                  type="button"
                  onClick={closeMobile}
                  className="inline-flex items-center justify-center rounded-md p-2 text-text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-primary"
                  aria-label="Close navigation"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
              <nav aria-label="Main navigation" className="flex-1 overflow-y-auto p-4">
                <ul className="flex flex-col gap-2">
                  {navItems.map((item) => (
                    <li key={item.href}>
                      {renderNavLink({
                        href: item.href,
                        className: cn(
                          'block rounded-md px-3 py-2 text-base font-medium transition-colors',
                          'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-primary',
                          item.isActive
                            ? 'bg-accent-primary/8 text-accent-primary'
                            : 'text-text-primary hover:bg-surface-subtle',
                        ),
                        'aria-current': item.isActive ? 'page' : undefined,
                        children: item.label,
                      })}
                    </li>
                  ))}
                </ul>
                {authActions && (
                  <div className="mt-6 border-t border-surface-subtle pt-4">{authActions}</div>
                )}
              </nav>
            </div>
          </>
        )}

        {/* Content area */}
        <main>{children}</main>
      </div>
    );
  },
);

PublicLayout.displayName = 'PublicLayout';

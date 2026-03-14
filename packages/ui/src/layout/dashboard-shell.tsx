import { forwardRef, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn';

const STORAGE_KEY = 'edin-sidebar-collapsed';

export interface DashboardShellProps {
  sidebar: ReactNode;
  children: ReactNode;
  defaultCollapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
  className?: string;
}

export const DashboardShell = forwardRef<HTMLDivElement, DashboardShellProps>(
  ({ sidebar, children, defaultCollapsed = false, onCollapseChange, className }, ref) => {
    const [collapsed, setCollapsed] = useState(defaultCollapsed);
    const [mobileOpen, setMobileOpen] = useState(false);
    const onCollapseChangeRef = useRef(onCollapseChange);
    const mobileNavRef = useRef<HTMLDivElement>(null);

    // Keep ref in sync
    useEffect(() => {
      onCollapseChangeRef.current = onCollapseChange;
    });

    // Read collapse preference from localStorage on mount
    useEffect(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
          const value = stored === 'true';
          setCollapsed(value);
        }
      } catch {
        // localStorage unavailable
      }
    }, []);

    const toggleCollapse = useCallback(() => {
      setCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem(STORAGE_KEY, String(next));
        } catch {
          // localStorage unavailable
        }
        onCollapseChangeRef.current?.(next);
        return next;
      });
    }, []);

    const closeMobile = useCallback(() => setMobileOpen(false), []);

    // Close mobile overlay on escape key
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
      <div ref={ref} className={cn('relative min-h-screen bg-surface-base', className)}>
        {/* Skip to content link */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-accent-primary focus:px-4 focus:py-2 focus:text-text-inverse focus:outline-none"
        >
          Skip to content
        </a>

        {/* Mobile top bar */}
        <header className="flex h-14 items-center border-b border-surface-subtle bg-surface-raised px-4 md:hidden">
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

        <div className="flex">
          {/* Desktop sidebar */}
          <aside
            className={cn(
              'hidden md:flex md:flex-col md:shrink-0 bg-surface-raised border-r border-surface-subtle',
              'transition-[width] duration-200 ease-out motion-reduce:transition-none',
              collapsed ? 'md:w-16' : 'md:w-60',
            )}
          >
            <nav aria-label="Sidebar navigation" className="flex flex-1 flex-col overflow-y-auto">
              {sidebar}
            </nav>
            <div className="border-t border-surface-subtle p-2">
              <button
                type="button"
                onClick={toggleCollapse}
                className="inline-flex w-full items-center justify-center rounded-md p-2 text-text-secondary hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-primary"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className={cn(
                    'transition-transform duration-200 motion-reduce:transition-none',
                    collapsed && 'rotate-180',
                  )}
                >
                  <path d="m11 17-5-5 5-5" />
                  <path d="m18 17-5-5 5-5" />
                </svg>
              </button>
            </div>
          </aside>

          {/* Main content */}
          <main id="main-content" className="min-w-0 flex-1 bg-surface-base">
            {children}
          </main>
        </div>

        {/* Mobile overlay */}
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={closeMobile}
              aria-hidden="true"
            />
            {/* Mobile sidebar — full-screen overlay */}
            <div
              ref={mobileNavRef}
              className="fixed inset-0 z-50 flex flex-col bg-surface-base md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
            >
              <div className="flex h-14 items-center justify-end border-b border-surface-subtle px-4">
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
              <nav aria-label="Sidebar navigation" className="flex-1 overflow-y-auto">
                {sidebar}
              </nav>
            </div>
          </>
        )}
      </div>
    );
  },
);

DashboardShell.displayName = 'DashboardShell';

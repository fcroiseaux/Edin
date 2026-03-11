'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/use-auth';
import { useUnreadCounts, useMarkAllNotificationsRead } from '../../hooks/use-notifications';
import { useNotificationSse } from '../../hooks/use-notification-sse';
import { ToastProvider } from '../../components/ui/toast';
import type { NotificationCategory } from '@edin/shared';

const DASHBOARD_NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/contributions', label: 'Contributions' },
  { href: '/evaluations', label: 'Evaluations' },
  { href: '/dashboard/tasks', label: 'Tasks' },
  { href: '/dashboard/activity', label: 'Activity' },
  { href: '/dashboard/feedback', label: 'Feedback' },
  { href: '/publication', label: 'Publication' },
  { href: '/dashboard/working-groups', label: 'Working Groups' },
  { href: '/dashboard/profile', label: 'Profile' },
];

const HREF_TO_CATEGORY: Record<string, NotificationCategory> = {
  '/dashboard/working-groups': 'working-groups',
  '/dashboard/tasks': 'tasks',
  '/dashboard/feedback': 'feedback',
  '/evaluations': 'evaluations',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const { counts } = useUnreadCounts();
  const markAllRead = useMarkAllNotificationsRead();
  const clearDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // SSE connection for real-time notification delivery
  useNotificationSse();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  // Auto-clear notifications when navigating to a category section
  useEffect(() => {
    if (clearDebounceRef.current) {
      clearTimeout(clearDebounceRef.current);
    }

    const matchedCategory = Object.entries(HREF_TO_CATEGORY).find(([href]) =>
      pathname.startsWith(href),
    );

    if (matchedCategory) {
      const [, category] = matchedCategory;
      if ((counts[category] ?? 0) > 0) {
        clearDebounceRef.current = setTimeout(() => {
          markAllRead.mutate(category);
        }, 500);
      }
    }

    return () => {
      if (clearDebounceRef.current) {
        clearTimeout(clearDebounceRef.current);
      }
    };
  }, [pathname, counts, markAllRead]);

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-surface-base lg:flex">
        <aside className="shrink-0 border-b border-surface-border bg-brand-primary text-surface-raised lg:min-h-screen lg:w-[240px] lg:border-b-0 lg:border-r">
          <div className="px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
            <Link
              href="/"
              className="flex items-center gap-[var(--spacing-sm)] transition-opacity duration-[var(--transition-fast)] hover:opacity-80"
            >
              <Image src="/edin-logo.png" alt="" width={32} height={32} className="rounded-full" />
              <p className="font-serif text-[24px] font-bold">Edin</p>
            </Link>
            <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-surface-raised/70">
              Contributor Dashboard
            </p>
          </div>
          <nav
            className="px-[var(--spacing-md)] pb-[var(--spacing-xl)]"
            aria-label="Dashboard navigation"
          >
            <ul className="flex flex-col gap-[var(--spacing-xs)]">
              {DASHBOARD_NAV_ITEMS.map((item) => {
                const isActive =
                  item.href === '/dashboard'
                    ? pathname === item.href
                    : pathname.startsWith(item.href);

                // Find if any notification category maps to this nav item
                const category = HREF_TO_CATEGORY[item.href];
                const hasUnread = category ? (counts[category] ?? 0) > 0 : false;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`relative flex min-h-[44px] items-center rounded-[var(--radius-md)] px-[var(--spacing-md)] font-sans text-[15px] transition-colors duration-[var(--transition-fast)] ${
                        isActive
                          ? 'bg-brand-accent-subtle text-brand-primary'
                          : 'text-surface-raised/85 hover:bg-surface-raised/10 hover:text-surface-raised'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {item.label}
                      {hasUnread && (
                        <span
                          className="animate-pulse-once ml-auto h-[8px] w-[8px] rounded-full bg-brand-accent"
                          aria-label="New notifications"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </ToastProvider>
  );
}

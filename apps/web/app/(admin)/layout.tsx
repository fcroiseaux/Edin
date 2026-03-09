'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/use-auth';

const ADMIN_NAV_ITEMS = [
  { href: '/admin/admission', label: 'Admission' },
  { href: '/admin/feedback', label: 'Feedback' },
  { href: '/admin/evaluations/models', label: 'Evaluations' },
  { href: '/admin/evaluations/review-queue', label: 'Review Queue' },
  { href: '/admin/settings', label: 'Settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || user?.role !== 'ADMIN')) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, isLoading, router, user?.role]);

  if (isLoading || !isAuthenticated || user?.role !== 'ADMIN') {
    return null;
  }

  return (
    <>
      <nav
        className="border-b border-surface-border bg-surface-raised"
        aria-label="Admin navigation"
      >
        <div className="mx-auto flex max-w-[1200px] items-center gap-[var(--spacing-md)] px-[var(--spacing-lg)] py-[var(--spacing-sm)]">
          <Link
            href="/dashboard"
            className="mr-[var(--spacing-md)] font-serif text-[18px] font-bold text-brand-primary"
          >
            Edin Admin
          </Link>
          {ADMIN_NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-[var(--radius-md)] px-[var(--spacing-md)] py-[var(--spacing-xs)] font-sans text-[14px] transition-colors ${
                  isActive
                    ? 'bg-brand-accent/10 font-medium text-brand-accent'
                    : 'text-brand-secondary hover:text-brand-primary'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
      {children}
    </>
  );
}

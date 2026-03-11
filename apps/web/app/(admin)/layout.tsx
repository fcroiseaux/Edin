'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/use-auth';

const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/admission', label: 'Admission' },
  { href: '/admin/contributors', label: 'Contributors' },
  { href: '/admin/feedback', label: 'Feedback' },
  { href: '/admin/evaluations/models', label: 'Evaluations' },
  { href: '/admin/evaluations/review-queue', label: 'Review Queue' },
  { href: '/admin/publication/moderation', label: 'Moderation' },
  { href: '/admin/audit-logs', label: 'Audit Logs' },
  { href: '/admin/compliance', label: 'Compliance' },
  { href: '/admin/reports', label: 'Reports' },
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
            href="/"
            className="mr-[var(--spacing-md)] flex items-center gap-[var(--spacing-sm)] font-serif text-[18px] font-bold text-brand-primary transition-colors duration-[var(--transition-fast)] hover:text-brand-accent"
          >
            <Image src="/edin-logo.png" alt="" width={24} height={24} className="rounded-full" />
            Edin Admin
          </Link>
          {ADMIN_NAV_ITEMS.map((item) => {
            const isActive =
              'exact' in item && item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
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

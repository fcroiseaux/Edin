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
    <div className="min-h-screen bg-surface-base lg:flex">
      <aside className="shrink-0 border-b border-surface-subtle bg-surface-raised lg:min-h-screen lg:w-[240px] lg:border-b-0 lg:border-r">
        <div className="px-6 py-8">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <Image
              src="/edin-logo.png"
              alt=""
              width={48}
              height={48}
              className="rounded-full brightness-125"
            />
            <p className="font-serif text-[24px] font-bold text-text-primary">Edin</p>
          </Link>
          <p className="mt-1 font-sans text-[13px] text-text-tertiary">Administration</p>
        </div>
        <nav className="px-4 pb-8" aria-label="Admin navigation">
          <ul className="flex flex-col gap-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const isActive =
                'exact' in item && item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex min-h-[44px] items-center rounded-md px-4 font-sans text-[15px] transition-colors ${
                      isActive
                        ? 'bg-accent-primary/8 text-accent-primary'
                        : 'text-text-primary hover:bg-surface-subtle'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../../hooks/use-auth';

const NAV_LINKS = [
  { href: '/articles', label: 'Publication' },
  { href: '/contributors', label: 'Contributors' },
  { href: '/about', label: 'About' },
  { href: '/docs', label: 'Docs' },
  { href: '/apply', label: 'Apply' },
];

export function PublicNav() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, login, logout } = useAuth();

  return (
    <nav className="border-b border-surface-border bg-surface-raised" aria-label="Main navigation">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-[var(--spacing-lg)] py-[var(--spacing-md)]">
        <Link
          href="/"
          className="flex items-center gap-[var(--spacing-sm)] font-serif text-[20px] font-bold text-brand-primary transition-colors duration-[var(--transition-fast)] hover:text-brand-accent"
        >
          <Image src="/edin-logo.png" alt="" width={28} height={28} className="rounded-full" />
          Edin
        </Link>

        <ul className="flex items-center gap-[var(--spacing-lg)]">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`font-sans text-[14px] font-medium transition-colors duration-[var(--transition-fast)] ${
                    isActive ? 'text-brand-accent' : 'text-brand-secondary hover:text-brand-primary'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
          <li>
            {isLoading ? null : isAuthenticated ? (
              <div className="flex items-center gap-[var(--spacing-md)]">
                <Link
                  href="/dashboard"
                  className="font-sans text-[14px] font-medium text-brand-secondary transition-colors duration-[var(--transition-fast)] hover:text-brand-primary"
                >
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-md)] py-[var(--spacing-xs)] font-sans text-[14px] font-medium text-brand-secondary transition-colors duration-[var(--transition-fast)] hover:bg-surface-base hover:text-brand-primary"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                onClick={login}
                className="rounded-[var(--radius-md)] bg-brand-primary px-[var(--spacing-md)] py-[var(--spacing-xs)] font-sans text-[14px] font-medium text-surface-raised transition-colors duration-[var(--transition-fast)] hover:bg-brand-accent"
              >
                Login with GitHub
              </button>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
}

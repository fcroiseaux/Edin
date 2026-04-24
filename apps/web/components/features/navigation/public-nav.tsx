'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../../hooks/use-auth';

const NAV_LINKS = [
  { href: '/newspaper', label: 'Newspaper' },
  { href: '/articles', label: 'Publication' },
  { href: '/contributors', label: 'Contributors' },
  { href: '/about', label: 'About' },
  { href: '/rose', label: 'About ROSE' },
  { href: '/docs', label: 'Docs' },
  { href: '/apply', label: 'Apply' },
];

export function PublicNav() {
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  return (
    <nav className="border-b border-surface-subtle bg-surface-raised" aria-label="Main navigation">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-serif text-[20px] font-bold text-text-primary transition-colors hover:text-accent-primary"
        >
          <Image
            src="/edin-logo.png"
            alt=""
            width={48}
            height={48}
            className="rounded-full brightness-[0.65] contrast-[1.3]"
          />
          Edin
        </Link>

        <ul className="flex items-center gap-6">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`font-sans text-[14px] font-medium transition-colors ${
                    isActive ? 'text-accent-primary' : 'text-text-secondary hover:text-text-primary'
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
              <div className="flex items-center gap-6">
                <Link
                  href="/dashboard"
                  className="font-sans text-[14px] font-medium text-text-secondary transition-colors hover:text-text-primary"
                >
                  Dashboard
                </Link>
                {user?.role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    className={`font-sans text-[14px] font-medium transition-colors ${
                      pathname.startsWith('/admin')
                        ? 'text-accent-primary'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                    aria-current={pathname.startsWith('/admin') ? 'page' : undefined}
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="rounded-md border border-surface-subtle px-4 py-1.5 font-sans text-[14px] font-medium text-text-secondary transition-colors hover:bg-surface-base hover:text-text-primary"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link
                href="/sign-in"
                className="rounded-md bg-accent-primary px-4 py-1.5 font-sans text-[14px] font-medium text-text-primary transition-colors hover:bg-accent-primary-hover"
              >
                Sign in
              </Link>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
}

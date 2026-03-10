'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const DOC_SECTIONS = [
  {
    title: 'Overview',
    links: [{ href: '/docs', label: 'Introduction' }],
  },
  {
    title: 'Getting Started',
    links: [
      { href: '/docs/getting-started', label: 'Application & Onboarding' },
      { href: '/docs/roles-permissions', label: 'Roles & Permissions' },
    ],
  },
  {
    title: 'Platform',
    links: [
      { href: '/docs/contributions', label: 'Contributions' },
      { href: '/docs/evaluations', label: 'AI Evaluations' },
      { href: '/docs/rewards', label: 'Rewards' },
      { href: '/docs/working-groups', label: 'Working Groups' },
    ],
  },
  {
    title: 'Publication',
    links: [{ href: '/docs/publication', label: 'Writing & Editorial' }],
  },
];

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="w-[240px] shrink-0 border-r border-surface-border pr-[var(--spacing-lg)]"
      aria-label="Documentation navigation"
    >
      <nav className="sticky top-[var(--spacing-lg)]">
        {DOC_SECTIONS.map((section) => (
          <div key={section.title} className="mb-[var(--spacing-lg)]">
            <h3 className="font-sans text-[11px] font-bold tracking-[0.05em] text-brand-secondary uppercase">
              {section.title}
            </h3>
            <ul className="mt-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-xs)]">
              {section.links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`block rounded-[var(--radius-sm)] px-[var(--spacing-sm)] py-[var(--spacing-xs)] font-sans text-[14px] transition-colors duration-[var(--transition-fast)] ${
                        isActive
                          ? 'bg-brand-accent-subtle font-medium text-brand-primary'
                          : 'text-brand-secondary hover:bg-surface-sunken hover:text-brand-primary'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

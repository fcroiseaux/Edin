import { forwardRef, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import type { Domain } from '../primitives/badge';

const domainDotColors: Record<Domain, string> = {
  tech: 'bg-pillar-tech',
  impact: 'bg-pillar-impact',
  governance: 'bg-pillar-governance',
  finance: 'bg-pillar-finance',
};

export interface NavItem {
  href: string;
  label: string;
  icon?: ReactNode;
  domain?: Domain;
  hasNotification?: boolean;
  isActive?: boolean;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export interface LinkRenderProps {
  href: string;
  className: string;
  children: ReactNode;
  'aria-current'?: 'page';
  'aria-label'?: string;
}

export interface SidebarNavProps {
  logo: ReactNode;
  subtitle?: string;
  sections: NavSection[];
  collapsed?: boolean;
  renderLink?: (props: LinkRenderProps) => ReactNode;
  className?: string;
}

export const SidebarNav = forwardRef<HTMLDivElement, SidebarNavProps>(
  ({ logo, subtitle, sections, collapsed = false, renderLink, className }, ref) => {
    const renderNavLink = (props: LinkRenderProps) => {
      if (renderLink) return renderLink(props);
      const { children, ...rest } = props;
      return <a {...rest}>{children}</a>;
    };

    return (
      <div ref={ref} className={cn('flex flex-col', className)}>
        {/* Logo area */}
        <div className={cn('p-4', collapsed && 'flex justify-center px-2')}>
          {logo}
          {subtitle && !collapsed && (
            <p className="mt-1 text-caption text-text-tertiary">{subtitle}</p>
          )}
        </div>

        {/* Navigation sections */}
        <div className="flex-1 space-y-4 px-2 pb-4">
          {sections.map((section, sIdx) => (
            <div key={section.title ?? sIdx}>
              {section.title && !collapsed && (
                <p className="mb-1 px-2 text-xs font-medium uppercase tracking-wider text-text-secondary">
                  {section.title}
                </p>
              )}
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const linkClassName = cn(
                    'group relative flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium outline-none transition-colors',
                    'focus-visible:ring-3 focus-visible:ring-accent-primary',
                    item.isActive
                      ? 'bg-accent-primary/8 text-accent-primary border-r-2 border-accent-primary'
                      : 'text-text-primary hover:bg-surface-subtle',
                    collapsed && 'justify-center px-0',
                  );

                  // Build aria-label: always include item label when notification present or collapsed
                  const ariaLabel = item.hasNotification
                    ? `${item.label}, new updates available`
                    : collapsed
                      ? item.label
                      : undefined;

                  return (
                    <li key={item.href}>
                      {renderNavLink({
                        href: item.href,
                        className: linkClassName,
                        'aria-current': item.isActive ? 'page' : undefined,
                        'aria-label': ariaLabel,
                        children: (
                          <>
                            {/* Domain color dot */}
                            {item.domain && (
                              <span
                                className={cn(
                                  'h-2 w-2 shrink-0 rounded-full',
                                  domainDotColors[item.domain],
                                  collapsed && 'absolute bottom-1 right-1',
                                )}
                                aria-hidden="true"
                              />
                            )}

                            {/* Icon */}
                            {item.icon && (
                              <span className="shrink-0" aria-hidden="true">
                                {item.icon}
                              </span>
                            )}

                            {/* Label */}
                            {!collapsed && <span className="flex-1">{item.label}</span>}

                            {/* Notification dot */}
                            {item.hasNotification && (
                              <span
                                className={cn(
                                  'h-1.5 w-1.5 shrink-0 rounded-full bg-accent-primary',
                                  collapsed && 'absolute right-1 top-1',
                                )}
                                aria-hidden="true"
                              />
                            )}
                          </>
                        ),
                      })}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  },
);

SidebarNav.displayName = 'SidebarNav';

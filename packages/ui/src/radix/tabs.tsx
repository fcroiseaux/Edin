import * as TabsPrimitive from '@radix-ui/react-tabs';
import { forwardRef } from 'react';
import { cn } from '../lib/cn';

const Tabs = TabsPrimitive.Root;

const TabsList = forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn('inline-flex items-center gap-1 border-b border-surface-subtle', className)}
    {...props}
  />
));
TabsList.displayName = 'TabsList';

import type { Domain } from '../primitives/badge';

const domainBorderColors: Record<Domain, string> = {
  tech: 'data-[state=active]:border-pillar-tech',
  impact: 'data-[state=active]:border-pillar-impact',
  governance: 'data-[state=active]:border-pillar-governance',
  finance: 'data-[state=active]:border-pillar-finance',
};

interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  domain?: Domain;
}

const TabsTrigger = forwardRef<React.ComponentRef<typeof TabsPrimitive.Trigger>, TabsTriggerProps>(
  ({ className, domain, ...props }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap px-3 py-2 text-sm font-medium text-text-secondary transition-colors',
        'border-b-2 border-transparent -mb-px',
        'hover:text-text-primary',
        'focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-primary',
        'disabled:pointer-events-none disabled:opacity-40',
        domain ? domainBorderColors[domain] : 'data-[state=active]:border-accent-primary',
        'data-[state=active]:text-text-primary',
        className,
      )}
      {...props}
    />
  ),
);
TabsTrigger.displayName = 'TabsTrigger';

const TabsContent = forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      'mt-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-accent-primary',
      className,
    )}
    {...props}
  />
));
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent, type TabsTriggerProps };

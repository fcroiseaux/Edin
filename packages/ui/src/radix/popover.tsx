import * as PopoverPrimitive from '@radix-ui/react-popover';
import { forwardRef } from 'react';
import { cn } from '../lib/cn';
import type { Domain } from '../primitives/badge';

const domainBorderColors: Record<Domain, string> = {
  tech: 'border-pillar-tech',
  impact: 'border-pillar-impact',
  governance: 'border-pillar-governance',
  finance: 'border-pillar-finance',
};

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;

interface PopoverContentProps extends React.ComponentPropsWithoutRef<
  typeof PopoverPrimitive.Content
> {
  domain?: Domain;
}

const PopoverContent = forwardRef<
  React.ComponentRef<typeof PopoverPrimitive.Content>,
  PopoverContentProps
>(({ className, domain, sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 w-72 rounded-md bg-surface-raised p-4 shadow-lg outline-none',
        domain ? `border ${domainBorderColors[domain]}` : 'border border-surface-subtle',
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverTrigger, PopoverContent, type PopoverContentProps };

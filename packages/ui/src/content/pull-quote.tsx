import { forwardRef, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface PullQuoteProps {
  children: ReactNode;
  className?: string;
}

export const PullQuote = forwardRef<HTMLQuoteElement, PullQuoteProps>(
  ({ children, className }, ref) => (
    <blockquote
      ref={ref}
      className={cn(
        'border-l-[3px] border-accent-primary pl-6 text-[24px] font-light leading-relaxed text-text-heading',
        className,
      )}
    >
      {children}
    </blockquote>
  ),
);

PullQuote.displayName = 'PullQuote';

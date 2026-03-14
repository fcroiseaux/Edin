import { forwardRef } from 'react';
import { cn } from '../lib/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles: Record<string, string> = {
  primary:
    'bg-accent-primary text-text-inverse font-medium hover:bg-accent-primary-hover focus-visible:ring-3 focus-visible:ring-accent-primary',
  secondary:
    'border border-surface-subtle bg-transparent text-text-primary font-medium hover:bg-surface-subtle focus-visible:ring-3 focus-visible:ring-accent-primary',
  ghost:
    'bg-transparent text-text-secondary font-medium hover:underline focus-visible:ring-3 focus-visible:ring-accent-primary',
};

const sizeStyles: Record<string, string> = {
  sm: 'min-h-[44px] min-w-[44px] px-3 py-1.5 text-sm',
  md: 'min-h-[44px] min-w-[44px] px-4 py-2 text-sm',
  lg: 'min-h-[48px] min-w-[48px] px-6 py-3 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center rounded-md outline-none transition-colors',
          variantStyles[variant],
          sizeStyles[size],
          disabled && 'pointer-events-none opacity-40 cursor-not-allowed',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

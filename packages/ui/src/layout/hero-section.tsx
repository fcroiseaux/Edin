import { forwardRef, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface HeroSectionProps {
  variant?: 'full' | 'compact';
  overline?: ReactNode;
  headline: ReactNode;
  subtitle?: ReactNode;
  cta?: ReactNode;
  className?: string;
}

export const HeroSection = forwardRef<HTMLElement, HeroSectionProps>(
  ({ variant = 'full', overline, headline, subtitle, cta, className }, ref) => (
    <section
      ref={ref}
      className={cn(
        'relative overflow-hidden bg-surface-base',
        variant === 'full' ? 'flex min-h-[80vh] items-center' : 'py-20',
        className,
      )}
      aria-label="Hero"
    >
      {/* Gradient glow overlay */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          /* accent-primary (#ff5a00) at 12%, accent-secondary (#e4bdb8) at 6% */
          background:
            'radial-gradient(ellipse 80% 60% at 50% 40%, rgb(from var(--color-accent-primary) r g b / 0.12) 0%, rgb(from var(--color-accent-secondary) r g b / 0.06) 40%, transparent 70%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-6 text-center">
        {overline && (
          <p className="text-sm font-medium uppercase tracking-[0.1em] text-accent-primary">
            {overline}
          </p>
        )}
        <div className="mt-4 text-display font-black text-text-primary">{headline}</div>
        {subtitle && (
          <p className="mx-auto mt-6 max-w-[560px] text-body-lg text-text-secondary">{subtitle}</p>
        )}
        {cta && <div className="mt-8 flex items-center justify-center gap-4">{cta}</div>}
      </div>
    </section>
  ),
);

HeroSection.displayName = 'HeroSection';

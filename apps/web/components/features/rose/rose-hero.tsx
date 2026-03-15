import Image from 'next/image';
import { ROSE_INTRO } from './rose-data';

export function RoseHero() {
  return (
    <section
      className="bg-linear-to-b from-surface-raised to-surface-sunken px-6 py-20"
      aria-label="About Rose"
    >
      <div className="mx-auto max-w-[1200px] text-center">
        <Image
          src="/rose-logo.svg"
          alt="Rose logo"
          width={400}
          height={400}
          className="mx-auto mb-10 opacity-80"
          priority
        />
        <h1 className="font-serif text-[clamp(2rem,5vw,2.5rem)] leading-[1.2] font-bold text-brand-primary">
          About Rose
        </h1>
        <p className="mx-auto mt-6 max-w-[680px] font-sans text-[15px] leading-[1.6] font-normal text-brand-secondary">
          {ROSE_INTRO}
        </p>
      </div>
    </section>
  );
}

export function RoseHeroSkeleton() {
  return (
    <section
      className="bg-linear-to-b from-surface-raised to-surface-sunken px-[var(--spacing-lg)] py-[var(--spacing-3xl)]"
      role="status"
      aria-label="Loading Rose section"
    >
      <div className="mx-auto max-w-[1200px] text-center">
        <div className="skeleton mx-auto h-[40px] w-[300px] max-w-full" />
        <div className="mx-auto mt-[var(--spacing-lg)] max-w-[560px] space-y-[var(--spacing-sm)]">
          <div className="skeleton mx-auto h-[20px] w-full" />
          <div className="skeleton mx-auto h-[20px] w-[80%]" />
        </div>
      </div>
    </section>
  );
}

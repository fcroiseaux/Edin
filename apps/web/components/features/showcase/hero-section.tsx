import Image from 'next/image';
import Link from 'next/link';

export function HeroSection() {
  return (
    <section
      className="bg-linear-to-b from-surface-raised to-surface-sunken px-[var(--spacing-lg)] py-[var(--spacing-4xl)]"
      aria-label="Project introduction"
    >
      <div className="mx-auto max-w-[1200px] text-center">
        <Image
          src="/edin-logo.png"
          alt="Edin logo"
          width={80}
          height={80}
          className="mx-auto mb-[var(--spacing-lg)] rounded-full"
          priority
        />
        <p className="font-mono text-[13px] font-medium uppercase tracking-[0.15em] text-brand-accent">
          Curated Contributor Platform
        </p>
        <h1 className="mt-[var(--spacing-md)] font-serif text-[clamp(2.25rem,5vw,3.25rem)] leading-[1.15] font-bold text-brand-primary">
          Where Expertise Becomes
          <br />
          Publication
        </h1>
        <p className="mx-auto mt-[var(--spacing-lg)] max-w-[560px] font-sans text-[16px] leading-[1.65] font-normal text-brand-secondary">
          A curated platform where every contribution is evaluated by AI, rewarded through
          scaling-law economics, and published by the community that built it.
        </p>
        <div className="mt-[var(--spacing-xl)] flex items-center justify-center gap-[var(--spacing-md)]">
          <Link
            href="/admission"
            className="inline-flex items-center rounded-[var(--radius-md)] bg-brand-primary px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] font-semibold text-surface-raised transition-opacity duration-[var(--transition-fast)] hover:opacity-90"
          >
            Apply to Join
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] font-semibold text-brand-primary transition-all duration-[var(--transition-fast)] hover:border-brand-secondary"
          >
            Learn More
          </Link>
        </div>
      </div>
    </section>
  );
}

export function HeroSkeleton() {
  return (
    <section
      className="bg-linear-to-b from-surface-raised to-surface-sunken px-[var(--spacing-lg)] py-[var(--spacing-4xl)]"
      role="status"
      aria-label="Loading hero section"
    >
      <div className="mx-auto max-w-[1200px] text-center">
        <div className="skeleton mx-auto h-[16px] w-[200px]" />
        <div className="skeleton mx-auto mt-[var(--spacing-md)] h-[48px] w-[500px] max-w-full" />
        <div className="mx-auto mt-[var(--spacing-lg)] max-w-[560px] space-y-[var(--spacing-sm)]">
          <div className="skeleton mx-auto h-[20px] w-full" />
          <div className="skeleton mx-auto h-[20px] w-[80%]" />
        </div>
      </div>
    </section>
  );
}

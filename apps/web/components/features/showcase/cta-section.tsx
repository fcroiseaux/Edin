import Link from 'next/link';

export function CtaSection() {
  return (
    <section
      className="bg-brand-primary px-[var(--spacing-lg)] py-[var(--spacing-3xl)]"
      aria-label="Call to action"
    >
      <div className="mx-auto max-w-[600px] text-center">
        <h2 className="font-serif text-[clamp(1.5rem,3vw,2rem)] leading-[1.25] font-bold text-surface-raised">
          Ready to Build Something Different?
        </h2>
        <p className="mx-auto mt-[var(--spacing-md)] max-w-[440px] font-sans text-[15px] leading-[1.6] text-surface-border">
          Join a curated community where your expertise is evaluated, rewarded, and published. The
          Founding Circle is forming now.
        </p>
        <div className="mt-[var(--spacing-xl)] flex items-center justify-center gap-[var(--spacing-md)]">
          <Link
            href="/admission"
            className="inline-flex items-center rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] font-semibold text-surface-raised transition-opacity duration-[var(--transition-fast)] hover:opacity-90"
          >
            Apply Now
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center rounded-[var(--radius-md)] border border-surface-border/30 px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] font-semibold text-surface-raised transition-opacity duration-[var(--transition-fast)] hover:opacity-80"
          >
            Read the Manifesto
          </Link>
        </div>
      </div>
    </section>
  );
}

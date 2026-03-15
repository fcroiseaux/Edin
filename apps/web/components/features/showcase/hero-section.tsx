import Image from 'next/image';
import Link from 'next/link';

export function HeroSection() {
  return (
    <section
      className="bg-linear-to-b from-surface-raised to-surface-sunken px-6 py-24"
      aria-label="Project introduction"
    >
      <div className="mx-auto max-w-[1200px] text-center">
        <Image
          src="/edin-logo.png"
          alt="Edin logo"
          width={200}
          height={200}
          className="mx-auto mb-8 rounded-full brightness-[0.65] contrast-[1.3]"
          priority
        />
        <p className="font-mono text-[13px] font-medium uppercase tracking-[0.15em] text-brand-accent">
          Contributor Platform for Rose
        </p>
        <h1 className="mt-4 font-serif text-[clamp(2.25rem,5vw,3.25rem)] leading-[1.15] font-bold text-brand-primary">
          Where Expertise Becomes
          <br />
          Publication
        </h1>
        <p className="mx-auto mt-6 max-w-[560px] font-sans text-[16px] leading-[1.65] font-normal text-brand-secondary">
          The contributor platform powering Rose, a new financial infrastructure for a fairer
          economy. Every contribution is evaluated by AI, rewarded through scaling-law economics,
          and published by the community.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            href="/admission"
            className="inline-flex items-center rounded-md bg-brand-primary px-6 py-2.5 font-sans text-[14px] font-semibold text-surface-raised transition-opacity hover:opacity-90"
          >
            Apply to Join
          </Link>
          <Link
            href="/rose"
            className="inline-flex items-center rounded-md border border-surface-border bg-surface-raised px-6 py-2.5 font-sans text-[14px] font-semibold text-brand-primary transition-all hover:border-brand-secondary"
          >
            Discover Rose
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center rounded-md border border-surface-border bg-surface-raised px-6 py-2.5 font-sans text-[14px] font-semibold text-brand-primary transition-all hover:border-brand-secondary"
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
      className="bg-linear-to-b from-surface-raised to-surface-sunken px-6 py-24"
      role="status"
      aria-label="Loading hero section"
    >
      <div className="mx-auto max-w-[1200px] text-center">
        <div className="skeleton mx-auto h-[16px] w-[200px]" />
        <div className="skeleton mx-auto mt-4 h-[48px] w-[500px] max-w-full" />
        <div className="mx-auto mt-6 max-w-[560px] space-y-2">
          <div className="skeleton mx-auto h-[20px] w-full" />
          <div className="skeleton mx-auto h-[20px] w-[80%]" />
        </div>
      </div>
    </section>
  );
}

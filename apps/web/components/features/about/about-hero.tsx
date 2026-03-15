import Image from 'next/image';

export function AboutHero() {
  return (
    <section
      className="bg-linear-to-b from-surface-raised to-surface-sunken px-6 py-20"
      aria-label="About Edin"
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
        <h1 className="font-serif text-[clamp(2rem,5vw,2.5rem)] leading-[1.2] font-bold text-brand-primary">
          About Edin
        </h1>
        <p className="mx-auto mt-6 max-w-[680px] font-sans text-[15px] leading-[1.6] font-normal text-brand-secondary">
          Named after the Sumerian word for a fertile plain, Edin is a curated contributor platform
          designed to organize, evaluate, and reward collaborative development within the Rose
          decentralized finance ecosystem.
        </p>
      </div>
    </section>
  );
}

export function AboutHeroSkeleton() {
  return (
    <section
      className="bg-linear-to-b from-surface-raised to-surface-sunken px-[var(--spacing-lg)] py-[var(--spacing-3xl)]"
      role="status"
      aria-label="Loading about section"
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

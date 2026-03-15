import Link from 'next/link';

export function CtaSection() {
  return (
    <section className="bg-brand-primary px-6 py-20" aria-label="Call to action">
      <div className="mx-auto max-w-[600px] text-center">
        <h2 className="font-serif text-[clamp(1.5rem,3vw,2rem)] leading-[1.25] font-bold text-text-primary">
          Ready to Build Something Different?
        </h2>
        <p className="mx-auto mt-4 max-w-[440px] font-sans text-[15px] leading-[1.6] text-text-secondary">
          Join a curated community where your expertise is evaluated, rewarded, and published. The
          Founding Circle is forming now.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/admission"
            className="inline-flex items-center rounded-md bg-accent-primary px-6 py-2.5 font-sans text-[14px] font-semibold text-text-primary transition-opacity hover:opacity-90"
          >
            Apply Now
          </Link>
          <Link
            href="/about"
            className="inline-flex items-center rounded-md border border-text-primary/30 px-6 py-2.5 font-sans text-[14px] font-semibold text-text-primary transition-opacity hover:opacity-80"
          >
            Read the Manifesto
          </Link>
        </div>
      </div>
    </section>
  );
}

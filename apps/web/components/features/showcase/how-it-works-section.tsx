const STEPS = [
  {
    number: '01',
    title: 'Contribute',
    description:
      'Work in your domain — code, documentation, governance, or impact research. Edin automatically ingests contributions from GitHub and connected tools.',
  },
  {
    number: '02',
    title: 'Get Evaluated',
    description:
      'Every contribution is scored by AI for quality, complexity, and impact. Transparent criteria applied consistently, complemented by peer feedback.',
  },
  {
    number: '03',
    title: 'Earn & Publish',
    description:
      'Rewards compound over time through scaling-law economics. Your best work becomes published articles, building your public portfolio of expertise.',
  },
];

export function HowItWorksSection() {
  return (
    <section className="px-6 py-20" aria-label="How it works">
      <div className="mx-auto max-w-[1200px]">
        <h2 className="text-center font-serif text-[clamp(1.5rem,3vw,2rem)] leading-[1.25] font-bold text-brand-primary">
          How It Works
        </h2>
        <p className="mx-auto mt-[var(--spacing-sm)] max-w-[480px] text-center font-sans text-[15px] leading-[1.6] text-brand-secondary">
          From contribution to publication in three steps.
        </p>

        <div className="mt-[var(--spacing-xl)] grid grid-cols-1 gap-[var(--spacing-lg)] md:grid-cols-3">
          {STEPS.map((step, index) => (
            <div key={step.number} className="relative text-center md:text-left">
              {/* Connector line for desktop */}
              {index < STEPS.length - 1 && (
                <div className="absolute top-[20px] right-0 hidden h-[1px] w-[var(--spacing-lg)] translate-x-full bg-surface-border md:block" />
              )}
              <span className="font-mono text-[32px] font-bold leading-none text-brand-accent-subtle">
                {step.number}
              </span>
              <h3 className="mt-[var(--spacing-sm)] font-sans text-[16px] font-semibold text-brand-primary">
                {step.title}
              </h3>
              <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

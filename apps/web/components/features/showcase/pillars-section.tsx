const PILLARS = [
  {
    title: 'AI-Powered Evaluation',
    description:
      'Every contribution is evaluated by an AI engine that scores quality, complexity, and impact. No subjective judgment — transparent criteria applied consistently to all contributors.',
    icon: (
      <svg
        className="h-[24px] w-[24px]"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
        />
      </svg>
    ),
  },
  {
    title: 'Compounding Rewards',
    description:
      'Rewards follow scaling-law mathematics that recognize sustained excellence. The more you contribute over time, the more your trajectory compounds — consistency over one-off bursts.',
    icon: (
      <svg
        className="h-[24px] w-[24px]"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"
        />
      </svg>
    ),
  },
  {
    title: 'Curated Community',
    description:
      'Quality through selectivity. Every contributor goes through an admission process with domain-specific micro-tasks and peer review. A high-caliber community where every voice carries weight.',
    icon: (
      <svg
        className="h-[24px] w-[24px]"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"
        />
      </svg>
    ),
  },
];

export function PillarsSection() {
  return (
    <section
      className="bg-surface-sunken px-[var(--spacing-lg)] py-[var(--spacing-2xl)]"
      aria-label="What makes Edin different"
    >
      <div className="mx-auto max-w-[1200px]">
        <h2 className="text-center font-serif text-[clamp(1.5rem,3vw,2rem)] leading-[1.25] font-bold text-brand-primary">
          What Makes Edin Different
        </h2>
        <p className="mx-auto mt-[var(--spacing-sm)] max-w-[520px] text-center font-sans text-[15px] leading-[1.6] text-brand-secondary">
          Three innovations combined to create a platform where expertise is recognized, measured,
          and rewarded fairly.
        </p>

        <div className="mt-[var(--spacing-xl)] grid grid-cols-1 gap-[var(--spacing-lg)] md:grid-cols-3">
          {PILLARS.map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]"
            >
              <div className="flex h-[44px] w-[44px] items-center justify-center rounded-[var(--radius-md)] bg-brand-accent-subtle text-brand-accent">
                {pillar.icon}
              </div>
              <h3 className="mt-[var(--spacing-md)] font-sans text-[16px] font-semibold text-brand-primary">
                {pillar.title}
              </h3>
              <p className="mt-[var(--spacing-sm)] font-sans text-[14px] leading-[1.65] text-brand-secondary">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { ROSE_CONCEPTS } from './rose-data';

export function RoseDetails() {
  return (
    <>
      {/* The Problem */}
      <section className="px-[var(--spacing-lg)] py-[var(--spacing-2xl)]" aria-label="The Problem">
        <div className="mx-auto max-w-[800px]">
          <h2 className="font-serif text-[1.75rem] leading-[1.3] font-bold text-text-primary">
            The Problem ROSE Addresses First
          </h2>
          <p className="mt-[var(--spacing-md)] font-serif text-[15px] leading-[1.7] text-text-primary">
            Today&apos;s financial system runs on infrastructure designed decades ago. Settlement
            takes days (T+2), capital sits idle overnight, and the system&apos;s slow reaction times
            amplify crises. Trillions in value are lost to friction, counterparty risk, and
            inefficiency. These structural flaws disproportionately affect smaller participants
            while concentrating advantages among large institutions.
          </p>
        </div>
      </section>

      {/* The ROSE Approach */}
      <section
        className="bg-surface-sunken px-[var(--spacing-lg)] py-[var(--spacing-2xl)]"
        aria-label="The ROSE Approach"
      >
        <div className="mx-auto max-w-[800px]">
          <h2 className="font-serif text-[1.75rem] leading-[1.3] font-bold text-text-primary">
            The ROSE Approach
          </h2>
          <div className="mt-[var(--spacing-xl)] flex flex-col gap-[var(--spacing-lg)]">
            {ROSE_CONCEPTS.map((concept, index) => (
              <div
                key={concept.title}
                className="relative flex gap-[var(--spacing-md)] pl-[var(--spacing-sm)]"
              >
                <div className="flex flex-col items-center">
                  <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-accent-primary font-mono text-[12px] font-bold text-surface-raised">
                    {index + 1}
                  </div>
                  {index < ROSE_CONCEPTS.length - 1 && (
                    <div className="mt-[var(--spacing-xs)] h-full w-[1px] bg-surface-border" />
                  )}
                </div>
                <div className="pb-[var(--spacing-md)]">
                  <h3 className="font-sans text-[15px] font-semibold text-text-primary">
                    {concept.title}
                  </h3>
                  <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.6] text-text-secondary">
                    {concept.fullDescription}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Broader Vision */}
      <section
        className="px-[var(--spacing-lg)] py-[var(--spacing-2xl)]"
        aria-label="The Broader Vision"
      >
        <div className="mx-auto max-w-[800px]">
          <h2 className="font-serif text-[1.75rem] leading-[1.3] font-bold text-text-primary">
            The Broader Vision
          </h2>
          <p className="mt-[var(--spacing-md)] font-serif text-[15px] leading-[1.7] text-text-primary">
            ROSE is more than a financial engine. The Alpha Engine captures the vast, previously
            wasted value of the price coastline and channels it into a Common Good Treasury that
            funds ecological and societal regeneration. The project aims to reprogram the economy,
            shifting it from profit-driven extraction to an abundance model where financial
            efficiency funds free water, free energy, and shared prosperity.
          </p>
        </div>
      </section>

      {/* Decentralized Common Good Structure */}
      <section
        className="bg-surface-sunken px-[var(--spacing-lg)] py-[var(--spacing-2xl)]"
        aria-label="Decentralized Common Good Structure"
      >
        <div className="mx-auto max-w-[800px]">
          <h2 className="font-serif text-[1.75rem] leading-[1.3] font-bold text-text-primary">
            Decentralized Common Good Structure
          </h2>
          <p className="mt-[var(--spacing-md)] font-serif text-[15px] leading-[1.7] text-text-primary">
            ROSE originated from trusted relationships across jurisdictions and domains. Designed to
            be &ldquo;sharded&rdquo; it starts formal operations under a Swiss Non-profit
            Association. ROSE is building a network of partner organisations as it extends the reach
            and scope of its vision.
          </p>
        </div>
      </section>
    </>
  );
}

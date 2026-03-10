import { REWARD_METHODOLOGY } from '@edin/shared';

const COMPONENT_ICONS: Record<string, string> = {
  'AI Evaluation': '\u2699',
  'Peer Feedback': '\u{1F91D}',
  'Task Complexity': '\u{1F4CA}',
  'Domain Normalization': '\u2696',
};

export function MethodologyOverview() {
  const paragraphs = REWARD_METHODOLOGY.overview.split('\n\n');

  return (
    <section
      className="mx-auto max-w-[720px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]"
      aria-label="Reward methodology overview"
    >
      <h2 className="font-serif text-[clamp(1.25rem,3vw,1.5rem)] leading-[1.3] font-semibold text-brand-primary">
        How Edin Rewards Sustained Contribution
      </h2>

      {/* Concise top-level summary */}
      <p className="mt-[var(--spacing-md)] font-serif text-[15px] leading-[1.6] text-brand-primary">
        {paragraphs[0]}
      </p>

      {/* Expandable deeper overview */}
      {paragraphs.length > 1 && (
        <details className="mt-[var(--spacing-md)]">
          <summary className="cursor-pointer font-sans text-[14px] font-medium text-brand-accent underline underline-offset-2 hover:opacity-80">
            Read more about the philosophy
          </summary>
          <div className="mt-[var(--spacing-sm)] space-y-[var(--spacing-md)]">
            {paragraphs.slice(1).map((p, i) => (
              <p key={i} className="font-serif text-[15px] leading-[1.6] text-brand-primary">
                {p}
              </p>
            ))}
          </div>
        </details>
      )}

      {/* Formula components as progressive disclosure */}
      <div className="mt-[var(--spacing-xl)]">
        <h3 className="font-serif text-[clamp(1.1rem,2.5vw,1.25rem)] leading-[1.3] font-semibold text-brand-primary">
          What Shapes Your Score
        </h3>
        <div className="mt-[var(--spacing-md)] space-y-[var(--spacing-xs)]">
          {REWARD_METHODOLOGY.formulaComponents.map((component) => (
            <details
              key={component.name}
              className="group rounded-[8px] border border-surface-border bg-surface-raised"
            >
              <summary className="cursor-pointer px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[15px] font-semibold text-brand-primary list-none">
                <span className="flex items-center gap-[var(--spacing-sm)]">
                  <span className="text-[20px]" aria-hidden="true">
                    {COMPONENT_ICONS[component.name] || '\u2022'}
                  </span>
                  {component.name}
                  <span className="ml-auto flex items-center gap-[var(--spacing-sm)]">
                    <span className="rounded-full bg-surface-sunken px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-normal text-brand-secondary">
                      {component.qualitativeWeight}
                    </span>
                    <span
                      className="text-[12px] text-brand-secondary transition-transform group-open:rotate-180"
                      aria-hidden="true"
                    >
                      &#9660;
                    </span>
                  </span>
                </span>
              </summary>
              <div className="px-[var(--spacing-md)] pb-[var(--spacing-md)] font-serif text-[14px] leading-[1.6] text-brand-secondary">
                {component.description}
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* How it all comes together */}
      <details className="mt-[var(--spacing-lg)]">
        <summary className="cursor-pointer font-sans text-[14px] font-medium text-brand-accent underline underline-offset-2 hover:opacity-80">
          How it all comes together
        </summary>
        <div className="mt-[var(--spacing-sm)] rounded-[8px] border border-surface-border bg-surface-raised p-[var(--spacing-md)]">
          <p className="font-serif text-[14px] leading-[1.6] text-brand-primary">
            Each contribution receives a composite score from all four dimensions. This score is
            then amplified by the scaling-law compounding multiplier based on your tenure — the
            longer you contribute, the higher the multiplier grows. Think of it as a garden: each
            seed you plant (contribution) grows stronger in rich soil (sustained engagement),
            producing an ever-richer harvest (compounded rewards).
          </p>
        </div>
      </details>
    </section>
  );
}

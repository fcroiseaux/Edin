const CORE_PRINCIPLES = [
  {
    title: 'AI-Powered Objective Evaluation',
    description:
      'Every contribution — code, documentation, governance proposal, or impact report — is evaluated by an AI engine that scores quality, complexity, and impact. No subjective judgment, no bias: transparent criteria applied consistently to all contributors.',
    icon: '01',
  },
  {
    title: 'Scaling-Law Compounding Rewards',
    description:
      'Rewards are distributed using mathematical scaling laws that recognize sustained excellence. The more you contribute over time, the more your compounding trajectory grows — rewarding consistency and long-term engagement, not just one-off bursts.',
    icon: '02',
  },
  {
    title: 'Integration-First, Zero Disruption',
    description:
      'Edin connects to the tools contributors already use — GitHub, Google Workspace, Slack. Contributions are ingested automatically through webhooks and integrations. No new workflow to learn, no context switching.',
    icon: '03',
  },
  {
    title: 'Curated Community',
    description:
      'Quality through selectivity. Every contributor goes through an admission process that includes domain-specific micro-tasks and a review by existing members. This ensures a high-caliber community where every voice carries weight.',
    icon: '04',
  },
  {
    title: 'Multi-Domain Equality',
    description:
      'Edin is built on four equal pillars: Technology, Fintech, Impact, and Governance. Unlike traditional open-source platforms that are code-centric, Edin values financial modeling, sustainability research, and governance design just as much as engineering.',
    icon: '05',
  },
  {
    title: 'Transparent Publication',
    description:
      'The best contributions become published articles, reviewed by domain editors and shared with the broader community. Contributors build a public portfolio of evaluated, peer-reviewed work that showcases their expertise.',
    icon: '06',
  },
];

const HOW_IT_WORKS_STEPS = [
  {
    step: 'Apply & Onboard',
    description:
      'Submit your application with your area of expertise. Complete domain-specific micro-tasks to demonstrate your skills. Once accepted, a buddy guides you through a 72-hour ignition onboarding.',
  },
  {
    step: 'Contribute',
    description:
      'Work on tasks across your domain — commit code, write documentation, propose governance changes, or conduct impact research. Edin automatically detects and ingests your contributions from connected tools.',
  },
  {
    step: 'Get Evaluated',
    description:
      'Every contribution is scored by the AI evaluation engine across dimensions like complexity, quality, test coverage, and impact. Results are transparent, explainable, and reviewable.',
  },
  {
    step: 'Receive Feedback',
    description:
      'Peers review your work through structured feedback rubrics. This human layer complements AI evaluation and fosters mentorship within the community.',
  },
  {
    step: 'Earn Rewards',
    description:
      'Your evaluation scores and peer feedback feed into a scaling-law reward model. Rewards compound over time, recognizing sustained commitment over sporadic contributions.',
  },
  {
    step: 'Publish & Grow',
    description:
      'Transform your best work into published articles. Build a public profile that showcases your evaluated contributions, peer endorsements, and domain expertise.',
  },
];

export function AboutDetails() {
  return (
    <>
      {/* Mission Section */}
      <section className="px-[var(--spacing-lg)] py-[var(--spacing-2xl)]" aria-label="Our Mission">
        <div className="mx-auto max-w-[800px]">
          <h2 className="font-serif text-[1.75rem] leading-[1.3] font-bold text-brand-primary">
            Our Mission
          </h2>
          <p className="mt-[var(--spacing-md)] font-serif text-[15px] leading-[1.7] text-brand-primary">
            Open-source contributors produce enormous value but receive zero structured
            compensation. Edin exists to change that. We combine three innovations — AI-powered
            objective evaluation, scaling-law reward mathematics, and curated admission — to create
            a platform where expertise is recognized, measured, and rewarded fairly.
          </p>
          <p className="mt-[var(--spacing-md)] font-serif text-[15px] leading-[1.7] text-brand-primary">
            Edin is not a tool replacement. It is an integration-first platform that connects to the
            workflows contributors already know — GitHub for code, Google Workspace for documents,
            Slack for communication — and layers on evaluation, rewards, and community structure
            without disrupting how people work.
          </p>
        </div>
      </section>

      {/* Core Principles */}
      <section
        className="bg-surface-sunken px-[var(--spacing-lg)] py-[var(--spacing-2xl)]"
        aria-label="Core Principles"
      >
        <div className="mx-auto max-w-[800px]">
          <h2 className="font-serif text-[1.75rem] leading-[1.3] font-bold text-brand-primary">
            What Makes Edin Different
          </h2>
          <div className="mt-[var(--spacing-xl)] flex flex-col gap-[var(--spacing-xl)]">
            {CORE_PRINCIPLES.map((principle) => (
              <div key={principle.title} className="flex gap-[var(--spacing-md)]">
                <span className="shrink-0 font-mono text-[13px] font-bold text-brand-accent">
                  {principle.icon}
                </span>
                <div>
                  <h3 className="font-sans text-[15px] font-semibold text-brand-primary">
                    {principle.title}
                  </h3>
                  <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
                    {principle.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-[var(--spacing-lg)] py-[var(--spacing-2xl)]" aria-label="How It Works">
        <div className="mx-auto max-w-[800px]">
          <h2 className="font-serif text-[1.75rem] leading-[1.3] font-bold text-brand-primary">
            How It Works
          </h2>
          <div className="mt-[var(--spacing-xl)] flex flex-col gap-[var(--spacing-lg)]">
            {HOW_IT_WORKS_STEPS.map((item, index) => (
              <div
                key={item.step}
                className="relative flex gap-[var(--spacing-md)] pl-[var(--spacing-sm)]"
              >
                <div className="flex flex-col items-center">
                  <div className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-brand-accent font-mono text-[12px] font-bold text-surface-raised">
                    {index + 1}
                  </div>
                  {index < HOW_IT_WORKS_STEPS.length - 1 && (
                    <div className="mt-[var(--spacing-xs)] h-full w-[1px] bg-surface-border" />
                  )}
                </div>
                <div className="pb-[var(--spacing-md)]">
                  <h3 className="font-sans text-[15px] font-semibold text-brand-primary">
                    {item.step}
                  </h3>
                  <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Domains Header */}
      <section
        className="bg-surface-sunken px-[var(--spacing-lg)] pt-[var(--spacing-2xl)] pb-[var(--spacing-md)]"
        aria-label="Our Domains"
      >
        <div className="mx-auto max-w-[800px]">
          <h2 className="font-serif text-[1.75rem] leading-[1.3] font-bold text-brand-primary">
            Our Four Domains
          </h2>
          <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.6] text-brand-secondary">
            Edin is built on four equal pillars of expertise. Each domain represents a critical
            dimension of the platform — from the code that powers it to the governance that shapes
            its future.
          </p>
        </div>
      </section>
    </>
  );
}

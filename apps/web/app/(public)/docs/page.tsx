import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Documentation — Edin',
  description:
    'Complete documentation for the Edin contributor platform: getting started, contributions, evaluations, rewards, and more.',
};

const QUICK_LINKS = [
  {
    href: '/docs/getting-started',
    title: 'Getting Started',
    description: 'How to apply, get accepted, and complete your onboarding.',
  },
  {
    href: '/docs/contributions',
    title: 'Contributions',
    description: 'How contributions are detected, tracked, and attributed.',
  },
  {
    href: '/docs/evaluations',
    title: 'AI Evaluations',
    description: 'How the AI evaluation engine scores your work.',
  },
  {
    href: '/docs/rewards',
    title: 'Rewards',
    description: 'How scaling-law rewards accumulate and compound over time.',
  },
  {
    href: '/docs/publication',
    title: 'Publication',
    description: 'How to write, submit, and publish articles on the platform.',
  },
  {
    href: '/docs/working-groups',
    title: 'Working Groups',
    description: 'How domain working groups organize collaboration.',
  },
];

export default function DocsPage() {
  return (
    <article className="docs-content">
      <h1 className="font-serif text-[clamp(1.75rem,4vw,2.25rem)] leading-[1.2] font-bold text-brand-primary">
        Edin Documentation
      </h1>
      <p className="mt-[var(--spacing-md)] max-w-[640px] font-sans text-[15px] leading-[1.6] text-brand-secondary">
        Welcome to the Edin documentation. Here you will find everything you need to understand how
        the platform works — from your first application to publishing articles and earning rewards.
      </p>

      {/* What is Edin */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          What is Edin?
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Edin is a curated contributor platform for the Rose decentralized finance ecosystem. It
          solves a fundamental problem in open-source: contributors produce enormous value but
          receive no structured recognition or compensation.
        </p>
        <p className="mt-[var(--spacing-sm)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          The platform combines three innovations to change that:
        </p>
        <ul className="mt-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-sm)] pl-[var(--spacing-md)]">
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            <strong className="text-brand-primary">AI-powered evaluation</strong> — every
            contribution is objectively scored across quality, complexity, and impact.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            <strong className="text-brand-primary">Scaling-law rewards</strong> — mathematical
            models that reward sustained engagement with compounding returns.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            <strong className="text-brand-primary">Curated admission</strong> — quality through
            selectivity ensures a high-caliber community.
          </li>
        </ul>
      </section>

      {/* Quick Links */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Explore the Docs
        </h2>
        <div className="mt-[var(--spacing-lg)] grid grid-cols-1 gap-[var(--spacing-md)] sm:grid-cols-2">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-md)] transition-all duration-[var(--transition-fast)] hover:border-brand-accent hover:shadow-card"
            >
              <h3 className="font-sans text-[15px] font-semibold text-brand-primary group-hover:text-brand-accent">
                {link.title}
              </h3>
              <p className="mt-[var(--spacing-xs)] font-sans text-[13px] leading-[1.5] text-brand-secondary">
                {link.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Platform Overview */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          How the Platform Works
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Edin operates as an integration-first platform. It connects to the tools you already use —
          GitHub for code, Google Workspace for documents — and automatically ingests your
          contributions through webhooks. There is no new workflow to learn.
        </p>
        <p className="mt-[var(--spacing-sm)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          The contributor lifecycle follows a clear path:{' '}
          <strong className="text-brand-primary">Apply</strong> to join the community,{' '}
          <strong className="text-brand-primary">Contribute</strong> through your domain of
          expertise, get <strong className="text-brand-primary">Evaluated</strong> by the AI engine
          and your peers, <strong className="text-brand-primary">Earn rewards</strong> that compound
          over time, and <strong className="text-brand-primary">Publish</strong> your best work as
          peer-reviewed articles.
        </p>
        <p className="mt-[var(--spacing-sm)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Edin is organized around four equal domains — Technology, Fintech, Impact, and Governance
          — ensuring that non-code contributions like financial modeling, sustainability research,
          and policy design are valued equally alongside engineering.
        </p>
      </section>
    </article>
  );
}

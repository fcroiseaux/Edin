import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contributions — Edin Docs',
  description: 'How contributions are detected, tracked, and attributed on the Edin platform.',
};

export default function ContributionsPage() {
  return (
    <article className="docs-content">
      <h1 className="font-serif text-[clamp(1.75rem,4vw,2.25rem)] leading-[1.2] font-bold text-brand-primary">
        Contributions
      </h1>
      <p className="mt-[var(--spacing-md)] max-w-[640px] font-sans text-[15px] leading-[1.6] text-brand-secondary">
        Everything you need to know about how Edin detects, tracks, and attributes your
        contributions.
      </p>

      {/* How Contributions Work */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          How Contributions Are Detected
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Edin uses an integration-first approach. Rather than requiring you to log work manually,
          the platform connects to the tools you already use and automatically ingests your
          contributions.
        </p>

        <h3 className="mt-[var(--spacing-lg)] font-sans text-[15px] font-semibold text-brand-primary">
          GitHub Integration
        </h3>
        <p className="mt-[var(--spacing-sm)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
          For monitored repositories, Edin receives webhook events from GitHub and automatically
          records the following contribution types:
        </p>
        <ul className="mt-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-sm)] pl-[var(--spacing-md)]">
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            <strong className="text-brand-primary">Commits</strong> — code changes pushed to
            monitored repositories.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            <strong className="text-brand-primary">Pull Requests</strong> — PRs opened, reviewed,
            and merged in monitored repositories.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            <strong className="text-brand-primary">Code Reviews</strong> — reviews and comments you
            leave on other contributors&apos; pull requests.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            <strong className="text-brand-primary">CI/CD Activity</strong> — pipeline runs and
            deployments associated with your changes.
          </li>
        </ul>
      </section>

      {/* Collaboration Detection */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Collaboration Detection
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Edin automatically detects when multiple contributors work together on the same piece of
          work. Collaboration is identified through:
        </p>
        <ul className="mt-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-sm)] pl-[var(--spacing-md)]">
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            Co-authored commits (using Git co-author trailers)
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            Multiple contributors working on the same pull request
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            Code review interactions on shared work
          </li>
        </ul>
        <p className="mt-[var(--spacing-sm)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
          When collaboration is detected, contributions are attributed to all participants with
          appropriate credit distribution.
        </p>
      </section>

      {/* Contribution Types */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Contribution Types by Domain
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Contributions are not limited to code. Each domain has its own types of valued work:
        </p>

        <div className="mt-[var(--spacing-lg)] flex flex-col gap-[var(--spacing-lg)]">
          <div className="rounded-[var(--radius-md)] border border-surface-border p-[var(--spacing-md)]">
            <h3 className="font-sans text-[15px] font-semibold text-domain-technology">
              Technology
            </h3>
            <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
              Code commits, pull requests, code reviews, infrastructure work, CI/CD pipelines,
              technical documentation, and developer tooling.
            </p>
          </div>

          <div className="rounded-[var(--radius-md)] border border-surface-border p-[var(--spacing-md)]">
            <h3 className="font-sans text-[15px] font-semibold text-domain-fintech">
              Fintech & Financial Engineering
            </h3>
            <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
              Financial models, reward mechanism design, economic analysis, tokenomics research,
              transparency reports, and compensation framework proposals.
            </p>
          </div>

          <div className="rounded-[var(--radius-md)] border border-surface-border p-[var(--spacing-md)]">
            <h3 className="font-sans text-[15px] font-semibold text-domain-impact">
              Impact & Sustainability
            </h3>
            <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
              Sustainability metrics, social impact reports, DEI initiatives, community health
              assessments, environmental accountability research, and well-being frameworks.
            </p>
          </div>

          <div className="rounded-[var(--radius-md)] border border-surface-border p-[var(--spacing-md)]">
            <h3 className="font-sans text-[15px] font-semibold text-domain-governance">
              Governance
            </h3>
            <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
              Policy proposals, voting mechanism design, decentralization roadmap contributions,
              community standards documentation, and accountability structures.
            </p>
          </div>
        </div>
      </section>

      {/* Viewing Contributions */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Viewing Your Contributions
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          All your contributions are visible in the{' '}
          <strong className="text-brand-primary">Dashboard &gt; Contributions</strong> page. Here
          you can:
        </p>
        <ul className="mt-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-sm)] pl-[var(--spacing-md)]">
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            See a chronological list of all ingested contributions
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            Filter by contribution type, date range, and status
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            View evaluation scores attached to each contribution
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            Track collaboration credits on shared work
          </li>
        </ul>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          The <strong className="text-brand-primary">Activity</strong> page provides a real-time
          feed of all contribution activity across the platform, visible to all community members.
        </p>
      </section>

      {/* Tasks */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Tasks
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Tasks are predefined units of work available in each domain. They range from beginner to
          advanced difficulty and provide a structured way to contribute. You can browse available
          tasks from <strong className="text-brand-primary">Dashboard &gt; Tasks</strong> and assign
          tasks to yourself from{' '}
          <strong className="text-brand-primary">Dashboard &gt; Tasks &gt; My Tasks</strong>.
        </p>
        <p className="mt-[var(--spacing-sm)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
          Tasks are tagged with difficulty levels and expected skill areas, making it easy to find
          work that matches your expertise. Completing tasks generates contributions that are
          automatically ingested and evaluated.
        </p>
      </section>
    </article>
  );
}

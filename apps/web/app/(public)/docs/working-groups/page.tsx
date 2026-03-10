import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Working Groups — Edin Docs',
  description: 'How domain working groups organize collaboration and community structure on Edin.',
};

export default function WorkingGroupsPage() {
  return (
    <article className="docs-content">
      <h1 className="font-serif text-[clamp(1.75rem,4vw,2.25rem)] leading-[1.2] font-bold text-brand-primary">
        Working Groups
      </h1>
      <p className="mt-[var(--spacing-md)] max-w-[640px] font-sans text-[15px] leading-[1.6] text-brand-secondary">
        Working groups are the organizational backbone of Edin. Each domain has its own working
        group where contributors collaborate, share knowledge, and coordinate efforts.
      </p>

      {/* The Four Working Groups */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          The Four Domain Working Groups
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Edin is organized around four equal domains. Each domain has a dedicated working group:
        </p>
        <div className="mt-[var(--spacing-lg)] flex flex-col gap-[var(--spacing-md)]">
          <div
            className="rounded-[var(--radius-md)] border-l-4 border-l-domain-technology p-[var(--spacing-md)]"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-domain-technology) 5%, transparent)',
            }}
          >
            <h3 className="font-sans text-[15px] font-semibold text-brand-primary">Technology</h3>
            <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
              Engineering, platform development, AI pipelines, infrastructure, and developer
              tooling.
            </p>
          </div>
          <div
            className="rounded-[var(--radius-md)] border-l-4 border-l-domain-fintech p-[var(--spacing-md)]"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-domain-fintech) 5%, transparent)',
            }}
          >
            <h3 className="font-sans text-[15px] font-semibold text-brand-primary">
              Fintech & Financial Engineering
            </h3>
            <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
              Reward models, economic analysis, financial transparency, and compensation frameworks.
            </p>
          </div>
          <div
            className="rounded-[var(--radius-md)] border-l-4 border-l-domain-impact p-[var(--spacing-md)]"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-domain-impact) 5%, transparent)',
            }}
          >
            <h3 className="font-sans text-[15px] font-semibold text-brand-primary">
              Impact & Sustainability
            </h3>
            <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
              Social impact measurement, sustainability metrics, DEI initiatives, and community
              health.
            </p>
          </div>
          <div
            className="rounded-[var(--radius-md)] border-l-4 border-l-domain-governance p-[var(--spacing-md)]"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--color-domain-governance) 5%, transparent)',
            }}
          >
            <h3 className="font-sans text-[15px] font-semibold text-brand-primary">Governance</h3>
            <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
              Decentralization roadmap, voting mechanisms, policy development, and accountability.
            </p>
          </div>
        </div>
      </section>

      {/* How Working Groups Operate */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          How Working Groups Operate
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Each working group is led by a Working Group Lead — an experienced contributor who
          coordinates the group&apos;s activities, manages task assignments, and mentors new
          members.
        </p>
        <p className="mt-[var(--spacing-sm)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Working groups provide:
        </p>
        <ul className="mt-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-sm)] pl-[var(--spacing-md)]">
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            <strong className="text-brand-primary">Task coordination</strong> — domain-specific
            tasks organized by difficulty level, from beginner to advanced.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            <strong className="text-brand-primary">Knowledge sharing</strong> — a space for
            contributors to share insights, discuss approaches, and learn from each other.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            <strong className="text-brand-primary">Mentorship</strong> — experienced members guide
            newcomers and help them grow within the domain.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            <strong className="text-brand-primary">Community building</strong> — working groups
            foster a sense of belonging and shared purpose within each domain.
          </li>
        </ul>
      </section>

      {/* Joining a Working Group */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Joining a Working Group
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          When you complete onboarding, you are invited to join the working group for your primary
          domain. You can browse all working groups and their members from{' '}
          <strong className="text-brand-primary">Dashboard &gt; Working Groups</strong>.
        </p>
        <p className="mt-[var(--spacing-sm)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Each working group page shows the group description, its lead, current members, and
          available tasks. You can also see the group&apos;s announcements and recent activity.
        </p>
      </section>

      {/* Activity Feed */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Activity Feed
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          The <strong className="text-brand-primary">Dashboard &gt; Activity</strong> page shows a
          real-time feed of all contribution activity across the platform. You can see what other
          contributors are working on, celebrate milestones, and stay connected with the community.
        </p>
        <p className="mt-[var(--spacing-sm)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Activity events are delivered in real time using server-sent events (SSE), so the feed
          updates automatically without refreshing the page.
        </p>
      </section>
    </article>
  );
}

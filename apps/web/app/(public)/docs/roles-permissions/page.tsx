import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Roles & Permissions — Edin Docs',
  description: 'Understanding the role hierarchy and permission system on the Edin platform.',
};

export default function RolesPermissionsPage() {
  return (
    <article className="docs-content">
      <h1 className="font-serif text-[clamp(1.75rem,4vw,2.25rem)] leading-[1.2] font-bold text-brand-primary">
        Roles & Permissions
      </h1>
      <p className="mt-[var(--spacing-md)] max-w-[640px] font-sans text-[15px] leading-[1.6] text-brand-secondary">
        Edin uses a role-based access control system with seven tiers. Each role grants specific
        permissions that determine what you can see and do on the platform.
      </p>

      {/* Role Hierarchy */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Role Hierarchy
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Roles are hierarchical — each role inherits all permissions from the roles below it.
        </p>
        <div className="mt-[var(--spacing-lg)] flex flex-col gap-[var(--spacing-md)]">
          <div className="rounded-[var(--radius-md)] border border-surface-border p-[var(--spacing-md)]">
            <div className="flex items-center gap-[var(--spacing-sm)]">
              <span className="font-mono text-[12px] font-bold text-brand-accent">Tier 1</span>
              <h3 className="font-sans text-[15px] font-semibold text-brand-primary">Public</h3>
            </div>
            <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
              Unauthenticated visitors. Can view public pages: homepage, published articles,
              contributor roster, about page, and documentation.
            </p>
          </div>

          <div className="rounded-[var(--radius-md)] border border-surface-border p-[var(--spacing-md)]">
            <div className="flex items-center gap-[var(--spacing-sm)]">
              <span className="font-mono text-[12px] font-bold text-brand-accent">Tier 2</span>
              <h3 className="font-sans text-[15px] font-semibold text-brand-primary">Applicant</h3>
            </div>
            <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
              Authenticated users who have submitted an application. Can view the application status
              and complete micro-tasks.
            </p>
          </div>

          <div className="rounded-[var(--radius-md)] border border-surface-border p-[var(--spacing-md)]">
            <div className="flex items-center gap-[var(--spacing-sm)]">
              <span className="font-mono text-[12px] font-bold text-brand-accent">Tier 3</span>
              <h3 className="font-sans text-[15px] font-semibold text-brand-primary">
                Contributor
              </h3>
            </div>
            <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
              Accepted community members. Full access to the dashboard: contributions, evaluations,
              tasks, working groups, feedback, publication, and reward tracking.
            </p>
          </div>

          <div className="rounded-[var(--radius-md)] border border-surface-border p-[var(--spacing-md)]">
            <div className="flex items-center gap-[var(--spacing-sm)]">
              <span className="font-mono text-[12px] font-bold text-brand-accent">Tier 4</span>
              <h3 className="font-sans text-[15px] font-semibold text-brand-primary">
                Founding Contributor
              </h3>
            </div>
            <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
              Early members who helped build the platform from the start. Same permissions as
              Contributor, plus recognition on the homepage founding circle and a special badge.
            </p>
          </div>

          <div className="rounded-[var(--radius-md)] border border-surface-border p-[var(--spacing-md)]">
            <div className="flex items-center gap-[var(--spacing-sm)]">
              <span className="font-mono text-[12px] font-bold text-brand-accent">Tier 5</span>
              <h3 className="font-sans text-[15px] font-semibold text-brand-primary">
                Working Group Lead
              </h3>
            </div>
            <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
              Leaders of domain working groups. Can manage group membership, create and assign
              tasks, post announcements, and flag evaluations for review.
            </p>
          </div>

          <div className="rounded-[var(--radius-md)] border border-surface-border p-[var(--spacing-md)]">
            <div className="flex items-center gap-[var(--spacing-sm)]">
              <span className="font-mono text-[12px] font-bold text-brand-accent">Tier 6</span>
              <h3 className="font-sans text-[15px] font-semibold text-brand-primary">Admin</h3>
            </div>
            <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
              Platform administrators. Access to the admin panel: contributor management,
              application review, platform settings, scoring configuration, reports, and content
              moderation.
            </p>
          </div>

          <div className="rounded-[var(--radius-md)] border border-surface-border p-[var(--spacing-md)]">
            <div className="flex items-center gap-[var(--spacing-sm)]">
              <span className="font-mono text-[12px] font-bold text-brand-accent">Tier 7</span>
              <h3 className="font-sans text-[15px] font-semibold text-brand-primary">
                Super Admin
              </h3>
            </div>
            <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
              Full platform control. Can manage all roles, access audit logs, handle GDPR compliance
              (data export, deletion), and configure AI evaluation models.
            </p>
          </div>
        </div>
      </section>

      {/* Data Privacy */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Data Privacy
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Edin is designed with privacy in mind. You can manage your privacy settings from{' '}
          <strong className="text-brand-primary">Dashboard &gt; Settings &gt; Privacy</strong>,
          where you can:
        </p>
        <ul className="mt-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-sm)] pl-[var(--spacing-md)]">
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            <strong className="text-brand-primary">Export your data</strong> — download all your
            personal data in a portable format (GDPR data portability).
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            <strong className="text-brand-primary">Request data deletion</strong> — exercise your
            right to erasure. Personal data is pseudonymized while contribution and evaluation
            records are preserved for platform integrity.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            <strong className="text-brand-primary">Review data processing</strong> — understand what
            data is collected and how it is used.
          </li>
        </ul>
      </section>

      {/* Notifications */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Notifications
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Edin sends real-time notifications for important events:
        </p>
        <ul className="mt-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-sm)] pl-[var(--spacing-md)]">
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            New evaluation results for your contributions
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            Peer feedback received on your work
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            Editorial decisions on your articles
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            Task assignments and working group announcements
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            Application status updates
          </li>
        </ul>
        <p className="mt-[var(--spacing-sm)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
          Notifications are delivered in real time via server-sent events and are visible in your
          dashboard.
        </p>
      </section>
    </article>
  );
}

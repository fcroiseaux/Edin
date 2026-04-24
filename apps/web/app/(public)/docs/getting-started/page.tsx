import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Getting Started — Edin Docs',
  description:
    'How to apply to Edin, complete the admission process, and onboard as a contributor.',
};

export default function GettingStartedPage() {
  return (
    <article className="docs-content">
      <h1 className="font-serif text-[clamp(1.75rem,4vw,2.25rem)] leading-[1.2] font-bold text-text-primary">
        Getting Started
      </h1>
      <p className="mt-[var(--spacing-md)] max-w-[640px] font-sans text-[15px] leading-[1.6] text-text-secondary">
        This guide covers how to apply, get accepted, and complete your onboarding on Edin.
      </p>

      {/* Application */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-text-primary">
          Applying to Edin
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-text-secondary">
          Edin is a curated community — not everyone who applies is accepted. This selectivity
          ensures a high-caliber contributor base where every member adds genuine value.
        </p>

        <h3 className="mt-[var(--spacing-lg)] font-sans text-[15px] font-semibold text-text-primary">
          Prerequisites
        </h3>
        <ul className="mt-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-sm)] pl-[var(--spacing-md)]">
          <li className="font-sans text-[14px] leading-[1.6] text-text-secondary">
            A GitHub account (used for authentication and contribution tracking)
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-text-secondary">
            Demonstrated expertise in at least one of the four domains
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-text-secondary">
            Willingness to complete domain-specific micro-tasks as part of the admission process
          </li>
        </ul>

        <h3 className="mt-[var(--spacing-lg)] font-sans text-[15px] font-semibold text-text-primary">
          Application Process
        </h3>
        <ol className="mt-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-sm)] pl-[var(--spacing-md)] list-decimal">
          <li className="font-sans text-[14px] leading-[1.6] text-text-secondary">
            <strong className="text-text-primary">Sign in with GitHub or Google</strong> — visit the{' '}
            <span className="text-accent-primary">Apply</span> page and authenticate with your
            GitHub or Google account.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-text-secondary">
            <strong className="text-text-primary">Select your domain</strong> — choose your primary
            area of expertise: Technology, Finance & Financial Engineering, Impact & Sustainability,
            or Governance.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-text-secondary">
            <strong className="text-text-primary">Complete micro-tasks</strong> — each domain has
            specific micro-tasks designed to evaluate your skills. These are small, focused
            exercises that demonstrate your competence.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-text-secondary">
            <strong className="text-text-primary">Submit your application</strong> — your
            application, including micro-task results, is reviewed by existing community members and
            administrators.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-text-secondary">
            <strong className="text-text-primary">Receive a decision</strong> — you will be notified
            of the outcome. Accepted contributors move to the onboarding phase.
          </li>
        </ol>
      </section>

      {/* Onboarding */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-text-primary">
          72-Hour Ignition Onboarding
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-text-secondary">
          Once accepted, you enter a structured 72-hour onboarding process designed to integrate you
          into the community quickly and effectively.
        </p>

        <h3 className="mt-[var(--spacing-lg)] font-sans text-[15px] font-semibold text-text-primary">
          Buddy Assignment
        </h3>
        <p className="mt-[var(--spacing-sm)] font-sans text-[14px] leading-[1.6] text-text-secondary">
          You are paired with an existing contributor who serves as your buddy during onboarding.
          Your buddy helps you navigate the platform, understand community norms, and find your
          first tasks. They are your go-to person for any questions during your initial days.
        </p>

        <h3 className="mt-[var(--spacing-lg)] font-sans text-[15px] font-semibold text-text-primary">
          Onboarding Milestones
        </h3>
        <p className="mt-[var(--spacing-sm)] font-sans text-[14px] leading-[1.6] text-text-secondary">
          The onboarding process includes specific milestones to complete within 72 hours:
        </p>
        <ul className="mt-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-sm)] pl-[var(--spacing-md)]">
          <li className="font-sans text-[14px] leading-[1.6] text-text-secondary">
            Complete your contributor profile (bio, skill areas, GitHub username)
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-text-secondary">
            Accept the data processing agreement
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-text-secondary">
            Join your domain working group
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-text-secondary">
            Make your first contribution
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-text-secondary">
            Connect with your assigned buddy
          </li>
        </ul>
      </section>

      {/* Profile Setup */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-text-primary">
          Setting Up Your Profile
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-text-secondary">
          Your contributor profile is your public identity on Edin. It is visible to other
          contributors and on the public contributors page.
        </p>
        <ul className="mt-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-sm)] pl-[var(--spacing-md)]">
          <li className="font-sans text-[14px] leading-[1.6] text-text-secondary">
            <strong className="text-text-primary">Display name</strong> — your public name on the
            platform.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-text-secondary">
            <strong className="text-text-primary">Bio</strong> — a short description of your
            expertise and interests.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-text-secondary">
            <strong className="text-text-primary">Skill areas</strong> — specific skills within your
            domain (e.g., for Technology: backend, frontend, DevOps, AI/ML).
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-text-secondary">
            <strong className="text-text-primary">GitHub username</strong> — linked to your account
            for contribution attribution.
          </li>
        </ul>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-text-secondary">
          You can edit your profile at any time from the{' '}
          <strong className="text-text-primary">Dashboard &gt; Profile</strong> page.
        </p>
      </section>
    </article>
  );
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Publication — Edin Docs',
  description: 'How to write, submit, edit, and publish articles on the Edin platform.',
};

export default function PublicationPage() {
  return (
    <article className="docs-content">
      <h1 className="font-serif text-[clamp(1.75rem,4vw,2.25rem)] leading-[1.2] font-bold text-brand-primary">
        Publication
      </h1>
      <p className="mt-[var(--spacing-md)] max-w-[640px] font-sans text-[15px] leading-[1.6] text-brand-secondary">
        Edin includes a full publication platform where contributors can write, submit, and publish
        peer-reviewed articles that showcase their expertise.
      </p>

      {/* Writing Articles */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Writing Articles
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Any contributor can write articles on topics related to their domain. Articles transform
          your contributions and expertise into published, peer-reviewed content that is visible to
          the entire community and the public.
        </p>

        <h3 className="mt-[var(--spacing-lg)] font-sans text-[15px] font-semibold text-brand-primary">
          Creating an Article
        </h3>
        <ol className="mt-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-sm)] pl-[var(--spacing-md)] list-decimal">
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            Navigate to{' '}
            <strong className="text-brand-primary">Dashboard &gt; Publication &gt; New</strong>.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            Enter your article title, select your domain, and start writing using the rich text
            editor.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            Save your work as a draft at any time — drafts are only visible to you.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            When ready, submit your article for editorial review.
          </li>
        </ol>
      </section>

      {/* Editorial Workflow */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Editorial Workflow
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Every article goes through a structured editorial process before publication:
        </p>
        <div className="mt-[var(--spacing-lg)] flex flex-col gap-[var(--spacing-sm)]">
          <div className="flex items-center gap-[var(--spacing-md)]">
            <span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-surface-sunken font-mono text-[12px] font-bold text-brand-secondary">
              1
            </span>
            <div>
              <span className="font-sans text-[14px] font-semibold text-brand-primary">Draft</span>
              <span className="ml-[var(--spacing-sm)] font-sans text-[13px] text-brand-secondary">
                — you write and refine your article privately.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-[var(--spacing-md)]">
            <span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-surface-sunken font-mono text-[12px] font-bold text-brand-secondary">
              2
            </span>
            <div>
              <span className="font-sans text-[14px] font-semibold text-brand-primary">
                In Review
              </span>
              <span className="ml-[var(--spacing-sm)] font-sans text-[13px] text-brand-secondary">
                — an editor from your domain reviews the article.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-[var(--spacing-md)]">
            <span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-surface-sunken font-mono text-[12px] font-bold text-brand-secondary">
              3
            </span>
            <div>
              <span className="font-sans text-[14px] font-semibold text-brand-primary">
                Revision
              </span>
              <span className="ml-[var(--spacing-sm)] font-sans text-[13px] text-brand-secondary">
                — you address editorial feedback and resubmit.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-[var(--spacing-md)]">
            <span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-surface-sunken font-mono text-[12px] font-bold text-brand-secondary">
              4
            </span>
            <div>
              <span className="font-sans text-[14px] font-semibold text-brand-primary">
                Approved
              </span>
              <span className="ml-[var(--spacing-sm)] font-sans text-[13px] text-brand-secondary">
                — the editor approves the article for publication.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-[var(--spacing-md)]">
            <span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-full bg-brand-accent font-mono text-[12px] font-bold text-surface-raised">
              5
            </span>
            <div>
              <span className="font-sans text-[14px] font-semibold text-brand-primary">
                Published
              </span>
              <span className="ml-[var(--spacing-sm)] font-sans text-[13px] text-brand-secondary">
                — the article is live and visible to everyone.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Becoming an Editor */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Becoming an Editor
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Editors are experienced contributors who review and approve articles in their domain. To
          become an editor, you must meet specific eligibility criteria:
        </p>
        <ul className="mt-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-sm)] pl-[var(--spacing-md)]">
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            Have a minimum number of published contributions in your domain
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            Maintain a consistently high evaluation score
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            Submit an editor application from{' '}
            <strong className="text-brand-primary">
              Dashboard &gt; Publication &gt; Editor Application
            </strong>
          </li>
        </ul>
        <p className="mt-[var(--spacing-sm)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
          Editors receive 20% of the reward generated by articles they review, incentivizing
          thorough and constructive editorial feedback.
        </p>
      </section>

      {/* Content Moderation */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Content Moderation
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          All submitted articles go through automated checks including plagiarism detection. The
          community and administrators can also flag published articles for content that violates
          community standards. Flagged articles are reviewed and may be unpublished if necessary.
        </p>
      </section>

      {/* Article Metrics */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Article Metrics
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Once published, you can track your article&apos;s performance from{' '}
          <strong className="text-brand-primary">
            Dashboard &gt; Publication &gt; [Article] &gt; Metrics
          </strong>
          . Metrics include view counts, engagement data, and the reward generated by the article.
        </p>
      </section>
    </article>
  );
}

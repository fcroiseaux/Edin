import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Evaluations — Edin Docs',
  description:
    'How the Edin AI evaluation engine scores contributions objectively and transparently.',
};

export default function EvaluationsPage() {
  return (
    <article className="docs-content">
      <h1 className="font-serif text-[clamp(1.75rem,4vw,2.25rem)] leading-[1.2] font-bold text-brand-primary">
        AI Evaluations
      </h1>
      <p className="mt-[var(--spacing-md)] max-w-[640px] font-sans text-[15px] leading-[1.6] text-brand-secondary">
        Edin uses an AI-powered evaluation engine to objectively score every contribution. This page
        explains how evaluations work, what criteria are used, and how you can understand your
        scores.
      </p>

      {/* How Evaluations Work */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          How Evaluations Work
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          When a contribution is ingested, it is queued for evaluation. The AI engine analyzes the
          contribution across multiple dimensions specific to its type. Evaluations are processed
          asynchronously — you will be notified when results are available.
        </p>
        <p className="mt-[var(--spacing-sm)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          The evaluation engine uses versioned models, meaning the criteria and weights can be
          updated over time. When a new model version is deployed, previous evaluations retain their
          original scores — they are never retroactively changed.
        </p>
      </section>

      {/* Code Evaluations */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Code Evaluation Criteria
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Code contributions (commits, pull requests) are evaluated across the following dimensions:
        </p>
        <div className="mt-[var(--spacing-lg)] flex flex-col gap-[var(--spacing-md)]">
          <div className="rounded-[var(--radius-md)] border border-surface-border p-[var(--spacing-md)]">
            <h3 className="font-sans text-[15px] font-semibold text-brand-primary">Complexity</h3>
            <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
              Measures the algorithmic and architectural complexity of the change. Simple
              refactoring scores lower than implementing a new distributed system component.
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-surface-border p-[var(--spacing-md)]">
            <h3 className="font-sans text-[15px] font-semibold text-brand-primary">Code Quality</h3>
            <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
              Assesses readability, maintainability, adherence to coding standards, and overall
              cleanliness of the implementation.
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-surface-border p-[var(--spacing-md)]">
            <h3 className="font-sans text-[15px] font-semibold text-brand-primary">
              Test Coverage
            </h3>
            <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
              Evaluates whether the contribution includes appropriate tests — unit tests,
              integration tests, and edge case coverage.
            </p>
          </div>
          <div className="rounded-[var(--radius-md)] border border-surface-border p-[var(--spacing-md)]">
            <h3 className="font-sans text-[15px] font-semibold text-brand-primary">Impact</h3>
            <p className="mt-[var(--spacing-xs)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
              Measures how significant the change is to the overall project — critical bug fixes and
              core feature implementations score higher than cosmetic changes.
            </p>
          </div>
        </div>
      </section>

      {/* Documentation Evaluations */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Documentation Evaluation Criteria
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Non-code contributions like documentation, reports, and proposals are evaluated using
          rubrics specific to their type. Common dimensions include:
        </p>
        <ul className="mt-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-sm)] pl-[var(--spacing-md)]">
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            <strong className="text-brand-primary">Clarity & Structure</strong> — how well-organized
            and readable the content is.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            <strong className="text-brand-primary">Completeness</strong> — whether the document
            covers all relevant aspects of the topic.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            <strong className="text-brand-primary">Accuracy</strong> — factual correctness and
            alignment with platform standards.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            <strong className="text-brand-primary">Actionability</strong> — whether the document
            leads to clear next steps or decisions.
          </li>
        </ul>
      </section>

      {/* Transparency */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Transparency & Explainability
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Every evaluation result includes a breakdown of scores across each dimension. You can see
          exactly how your contribution was assessed and why it received the scores it did. This
          transparency is a core design principle — there are no black-box evaluations.
        </p>
        <p className="mt-[var(--spacing-sm)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          You can view your evaluation scores from{' '}
          <strong className="text-brand-primary">Dashboard &gt; Evaluations</strong>, where each
          evaluation shows the overall score and the per-dimension breakdown.
        </p>
      </section>

      {/* Peer Feedback */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Peer Feedback
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          In addition to AI evaluation, contributions receive peer feedback from other community
          members. Peer feedback uses a structured rubric with 5 to 7 questions designed to capture
          human judgment that AI might miss — creativity, collaboration quality, and mentorship.
        </p>
        <p className="mt-[var(--spacing-sm)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Reviewers are automatically assigned to ensure balanced feedback distribution. You can
          view feedback you have received and feedback you need to provide from{' '}
          <strong className="text-brand-primary">Dashboard &gt; Feedback</strong>.
        </p>
      </section>

      {/* Evaluation Review */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Evaluation Review Process
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          If you believe an AI evaluation does not accurately reflect the quality of your
          contribution, a human review process is available. Evaluations can be flagged for review
          by administrators or working group leads, who compare the AI assessment against expert
          human judgment.
        </p>
        <p className="mt-[var(--spacing-sm)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          The evaluation review process helps calibrate and improve the AI models over time,
          ensuring that evaluations become more accurate with each iteration.
        </p>
      </section>
    </article>
  );
}

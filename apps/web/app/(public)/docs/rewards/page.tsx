import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Rewards — Edin Docs',
  description:
    'How the Edin scaling-law reward system works: scoring, compounding trajectories, and reward distribution.',
};

export default function RewardsPage() {
  return (
    <article className="docs-content">
      <h1 className="font-serif text-[clamp(1.75rem,4vw,2.25rem)] leading-[1.2] font-bold text-brand-primary">
        Rewards
      </h1>
      <p className="mt-[var(--spacing-md)] max-w-[640px] font-sans text-[15px] leading-[1.6] text-brand-secondary">
        Edin uses a scaling-law reward model that recognizes sustained contribution over time. This
        page explains how rewards are calculated, how they compound, and how to track your reward
        trajectory.
      </p>

      {/* Reward Philosophy */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Reward Philosophy
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Traditional open-source compensation is either non-existent or based on subjective
          decisions. Edin takes a different approach: rewards are mathematically derived from
          objective evaluation data.
        </p>
        <p className="mt-[var(--spacing-sm)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          The key principle is <strong className="text-brand-primary">compounding value</strong>.
          Contributors who deliver high-quality work consistently over time earn exponentially more
          than those who contribute sporadically. This reflects the reality that sustained
          engagement creates more value than one-off contributions.
        </p>
      </section>

      {/* Contribution Scoring */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Contribution Scoring
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Each contribution receives a composite score based on three inputs:
        </p>
        <ul className="mt-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-sm)] pl-[var(--spacing-md)]">
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            <strong className="text-brand-primary">AI Evaluation Score</strong> — the objective
            quality assessment from the AI engine (complexity, quality, test coverage, impact).
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            <strong className="text-brand-primary">Peer Feedback Score</strong> — aggregated
            feedback from community members who reviewed the work.
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            <strong className="text-brand-primary">Task Complexity</strong> — the difficulty level
            of the task or contribution type.
          </li>
        </ul>
        <p className="mt-[var(--spacing-sm)] font-sans text-[14px] leading-[1.6] text-brand-secondary">
          These three inputs are weighted and combined into a single contribution score that feeds
          into the reward model.
        </p>
      </section>

      {/* Scaling-Law Model */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Scaling-Law Compounding
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          The reward model uses mathematical scaling laws to distribute rewards across multiple time
          horizons. This means that your rewards are not just based on individual contributions but
          on your trajectory of contributions over time.
        </p>
        <p className="mt-[var(--spacing-sm)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          The multi-temporal distribution means rewards are calculated at different intervals —
          weekly, monthly, and quarterly — with each time horizon having its own weight. Longer
          periods reward consistency more heavily.
        </p>
        <p className="mt-[var(--spacing-sm)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          For a detailed explanation of the mathematical model, visit the{' '}
          <Link href="/rewards/methodology" className="text-brand-accent hover:underline">
            Reward Methodology
          </Link>{' '}
          page.
        </p>
      </section>

      {/* Reward Trajectory */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Tracking Your Trajectory
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          The <strong className="text-brand-primary">Dashboard &gt; Rewards &gt; Trajectory</strong>{' '}
          page provides a visual representation of your reward trajectory over time. You can see:
        </p>
        <ul className="mt-[var(--spacing-sm)] flex flex-col gap-[var(--spacing-sm)] pl-[var(--spacing-md)]">
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            Your cumulative reward score over time
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            The compounding effect of sustained contributions
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            Projected future trajectory based on current velocity
          </li>
          <li className="font-sans text-[14px] leading-[1.6] text-brand-secondary">
            Comparison with community benchmarks
          </li>
        </ul>
      </section>

      {/* Publication Rewards */}
      <section className="mt-[var(--spacing-2xl)]">
        <h2 className="font-serif text-[1.5rem] leading-[1.3] font-bold text-brand-primary">
          Publication Rewards
        </h2>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Published articles generate additional rewards. The reward split follows an 80/20 model:
          80% goes to the article author(s) and 20% goes to the editor who reviewed and approved the
          article. This incentivizes both content creation and editorial quality.
        </p>
        <p className="mt-[var(--spacing-sm)] font-sans text-[15px] leading-[1.7] text-brand-secondary">
          Article view counts also factor into reward calculations, meaning that articles with
          higher community engagement generate more value for their authors and editors.
        </p>
      </section>
    </article>
  );
}

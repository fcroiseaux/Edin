import type { Metadata } from 'next';
import { REWARD_METHODOLOGY } from '@edin/shared';
import { RewardsHero } from '../../../../components/features/rewards/rewards-hero';
import { MethodologyOverview } from '../../../../components/features/rewards/methodology-overview';
import { GrowthCurveChart } from '../../../../components/features/rewards/growth-curve-chart';
import { WorkedExamples } from '../../../../components/features/rewards/worked-examples';
import { MethodologyCalculator } from '../../../../components/features/rewards/methodology-calculator';
import { GlossarySection } from '../../../../components/features/rewards/glossary-section';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Reward Methodology — Edin',
    description:
      'Understand how Edin rewards sustained engagement through a scaling-law model: contributions compound over time, creating accelerating recognition for dedicated contributors.',
    openGraph: {
      title: 'Reward Methodology — Edin',
      description:
        'Understand how Edin rewards sustained engagement through a scaling-law model that compounds contributions over time.',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Reward Methodology — Edin',
      description:
        'Understand how Edin rewards sustained engagement through a scaling-law model that compounds contributions over time.',
    },
  };
}

export default function MethodologyPage() {
  return (
    <main className="min-h-screen bg-surface-base">
      <RewardsHero />
      <MethodologyOverview />
      <GrowthCurveChart data={REWARD_METHODOLOGY.scalingCurve} />
      <WorkedExamples />
      <MethodologyCalculator />
      <GlossarySection terms={REWARD_METHODOLOGY.glossary} />
    </main>
  );
}

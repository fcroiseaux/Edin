'use client';

import { REWARD_METHODOLOGY } from '@edin/shared';
import { RewardsHero } from '../../../../../components/features/rewards/rewards-hero';
import { MethodologyOverview } from '../../../../../components/features/rewards/methodology-overview';
import { GrowthCurveChart } from '../../../../../components/features/rewards/growth-curve-chart';
import { WorkedExamples } from '../../../../../components/features/rewards/worked-examples';
import { MethodologyCalculator } from '../../../../../components/features/rewards/methodology-calculator';
import { GlossarySection } from '../../../../../components/features/rewards/glossary-section';

export default function DashboardMethodologyPage() {
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

'use client';

import type { PublicContributorProfile } from '@edin/shared';
import type { PublicEvaluationAggregateDto } from '@edin/shared';
import { HeroSection } from './hero-section';
import { HowItWorksSection } from './how-it-works-section';
import { PillarsSection } from './pillars-section';
import { DomainsSection } from './domains-section';
import { FoundingCircle } from './founding-circle';
import { CtaSection } from './cta-section';
import { useFoundingContributors } from '../../../hooks/use-founding-contributors';
import { EvaluationMetricsSection } from '../evaluation/public/evaluation-metrics-section';

interface ShowcaseContentProps {
  initialContributors: PublicContributorProfile[];
  initialEvaluationMetrics?: PublicEvaluationAggregateDto;
}

export function ShowcaseContent({
  initialContributors,
  initialEvaluationMetrics,
}: ShowcaseContentProps) {
  const { contributors } = useFoundingContributors(initialContributors);

  return (
    <>
      <HeroSection />
      <HowItWorksSection />
      <PillarsSection />
      <EvaluationMetricsSection initialData={initialEvaluationMetrics} />
      <DomainsSection />
      <FoundingCircle contributors={contributors} />
      <CtaSection />
    </>
  );
}

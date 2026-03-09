'use client';

import type { PublicContributorProfile } from '@edin/shared';
import type { PublicEvaluationAggregateDto } from '@edin/shared';
import { HeroSection } from './hero-section';
import { FoundingCircle } from './founding-circle';
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
      <EvaluationMetricsSection initialData={initialEvaluationMetrics} />
      <FoundingCircle contributors={contributors} />
    </>
  );
}

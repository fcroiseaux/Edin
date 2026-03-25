import type { Metadata } from 'next';
import type { PublicContributorProfile, PublicEvaluationAggregateDto } from '@edin/shared';
import { ShowcaseContent } from '../../components/features/showcase/showcase-content';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchFoundingContributors(): Promise<PublicContributorProfile[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/contributors/founding`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return [];
    }

    const body = await response.json();
    return body.data ?? [];
  } catch (error) {
    console.error('Failed to fetch founding contributors for showcase page', error);
    return [];
  }
}

async function fetchEvaluationMetrics(): Promise<PublicEvaluationAggregateDto | undefined> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/public/evaluations/aggregate`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return undefined;
    }

    const body = await response.json();
    return body.data ?? undefined;
  } catch (error) {
    console.error('Failed to fetch evaluation metrics for showcase page', error);
    return undefined;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Edin — Contributor Platform Powering ROSE',
    description:
      'Edin is the contributor platform for ROSE, a common good initiative building decentralized financial infrastructure. Contribute across technology, finance, impact, and governance — evaluated by AI, rewarded through scaling-law economics.',
    openGraph: {
      title: 'Edin — Contributor Platform Powering ROSE',
      description:
        'Edin is the contributor platform for ROSE, a common good initiative building decentralized financial infrastructure. Contribute across technology, finance, impact, and governance — evaluated by AI, rewarded through scaling-law economics.',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Edin — Contributor Platform Powering ROSE',
      description:
        'Edin is the contributor platform for ROSE, a common good initiative building decentralized financial infrastructure. Contribute across technology, finance, impact, and governance — evaluated by AI, rewarded through scaling-law economics.',
    },
  };
}

export default async function ShowcasePage() {
  const [contributors, evaluationMetrics] = await Promise.all([
    fetchFoundingContributors(),
    fetchEvaluationMetrics(),
  ]);

  return (
    <main className="min-h-screen bg-surface-base">
      <ShowcaseContent
        initialContributors={contributors}
        initialEvaluationMetrics={evaluationMetrics}
      />
    </main>
  );
}

import { Suspense } from 'react';
import type { Metadata } from 'next';
import type { NewspaperEditionWithItemsDto } from '@edin/shared';
import { NewspaperLayout } from '../../../components/features/newspaper/newspaper-layout';
import { NewspaperSkeleton } from '../../../components/features/newspaper/newspaper-skeleton';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function fetchLatestEdition(): Promise<NewspaperEditionWithItemsDto | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/newspaper/editions/latest`, {
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return null;
    }

    const body = await response.json();
    return body.data ?? null;
  } catch (error) {
    console.error('Failed to fetch latest newspaper edition', error);
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Contributor Newspaper - Edin',
    description:
      'The Contributor Newspaper celebrates community achievements through a curated, event-driven publication. See prizes awarded, milestones reached, and collaborations detected across the Edin platform.',
    openGraph: {
      title: 'Contributor Newspaper - Edin',
      description:
        'The Contributor Newspaper celebrates community achievements through a curated, event-driven publication.',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Contributor Newspaper - Edin',
      description:
        'The Contributor Newspaper celebrates community achievements through a curated, event-driven publication.',
    },
  };
}

export default async function NewspaperPage() {
  const latestEdition = await fetchLatestEdition();

  return (
    <main className="min-h-screen bg-surface-base">
      <Suspense fallback={<NewspaperSkeleton />}>
        <NewspaperLayout edition={latestEdition} />
      </Suspense>
    </main>
  );
}

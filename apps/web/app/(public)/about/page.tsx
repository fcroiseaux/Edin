import type { Metadata } from 'next';
import { DOMAIN_MANIFESTOS } from '@edin/shared';
import { AboutHero } from '../../../components/features/about/about-hero';
import { AboutDetails } from '../../../components/features/about/about-details';
import { ManifestoGrid } from '../../../components/features/about/manifesto-grid';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'About Edin — Where Expertise Becomes Publication',
    description:
      'Edin is a curated contributor platform that combines AI-powered evaluation, scaling-law rewards, and community-driven publication to recognize and reward open-source contributors.',
    openGraph: {
      title: 'About Edin — Where Expertise Becomes Publication',
      description:
        'Edin is a curated contributor platform that combines AI-powered evaluation, scaling-law rewards, and community-driven publication.',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'About Edin — Where Expertise Becomes Publication',
      description:
        'Edin is a curated contributor platform that combines AI-powered evaluation, scaling-law rewards, and community-driven publication.',
    },
  };
}

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-surface-base">
      <AboutHero />
      <AboutDetails />
      <div className="bg-surface-sunken">
        <ManifestoGrid manifestos={DOMAIN_MANIFESTOS} />
      </div>
    </main>
  );
}

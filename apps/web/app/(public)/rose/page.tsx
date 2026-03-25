import type { Metadata } from 'next';
import { RoseHero } from '../../../components/features/rose/rose-hero';
import { RoseDetails } from '../../../components/features/rose/rose-details';

const META_TITLE = 'About ROSE — Reinventing Financial Architecture';
const META_DESCRIPTION =
  'ROSE is a common good initiative operating under a Swiss non-profit association to build a decentralized financial infrastructure through intrinsic time, coupled assets, and atomic settlement.';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: META_TITLE,
    description: META_DESCRIPTION,
    openGraph: {
      title: META_TITLE,
      description: META_DESCRIPTION,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: META_TITLE,
      description: META_DESCRIPTION,
    },
  };
}

export default function RosePage() {
  return (
    <main className="min-h-screen bg-surface-base">
      <RoseHero />
      <RoseDetails />
    </main>
  );
}

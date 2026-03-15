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

      {/* Psalm — Paul Celan */}
      <section className="px-6 py-24" aria-label="Psalm">
        <div className="mx-auto max-w-[600px] text-center">
          <h2 className="font-serif text-[1.5rem] font-bold italic text-text-heading">Psalm</h2>
          <div className="mt-10 space-y-6 font-serif text-[17px] leading-[1.8] text-text-secondary">
            <p>
              No one moulds us again out of earth and clay,
              <br />
              no one conjures our dust.
              <br />
              No one.
            </p>
            <p>
              Praised be your name, no one.
              <br />
              For your sake we shall
              <br />
              flower.
              <br />
              Towards
              <br />
              you.
            </p>
            <p>
              A nothing
              <br />
              we were, are, shall
              <br />
              remain, flowering:
              <br />
              the nothing-, the
              <br />
              no one&rsquo;s rose.
            </p>
            <p>
              With
              <br />
              our pistil soul-bright,
              <br />
              our stamen heaven-ravaged,
              <br />
              our corolla red
              <br />
              with the crimson word which we sang
              <br />
              over, O over
              <br />
              the thorn.
            </p>
          </div>
          <p className="mt-8 text-caption text-text-tertiary">Paul Celan</p>
        </div>
      </section>
    </main>
  );
}

'use client';

import Link from 'next/link';

export function NewspaperEmptyState() {
  return (
    <div className="mx-auto max-w-[640px] py-16 px-6 text-center">
      <div className="text-[3rem] mb-6 opacity-40" aria-hidden="true">
        {'\u{1F4F0}'}
      </div>
      <h2 className="font-serif text-[1.75rem] font-bold text-text-heading mb-4">
        The Contributor Newspaper
      </h2>
      <p className="font-sans text-body text-text-secondary mb-3 max-w-[480px] mx-auto">
        The Contributor Newspaper celebrates community achievements through a curated, event-driven
        publication. Editions appear when meaningful activity accumulates — prizes awarded,
        milestones reached, collaborations detected.
      </p>
      <p className="font-sans text-body-sm text-text-tertiary mb-8 max-w-[480px] mx-auto">
        The first edition will be published when significant community events occur. Check back
        soon.
      </p>
      <div className="flex items-center justify-center gap-4">
        <Link
          href="/about"
          className="inline-flex items-center rounded-radius-md border border-surface-subtle px-4 py-2 text-body-sm font-medium text-text-secondary transition-colors hover:bg-surface-raised hover:text-text-primary min-h-[44px]"
        >
          Learn About Edin
        </Link>
        <Link
          href="/apply"
          className="inline-flex items-center rounded-radius-md bg-accent-primary px-4 py-2 text-body-sm font-medium text-text-primary transition-colors hover:bg-accent-primary-hover min-h-[44px]"
        >
          Apply to Contribute
        </Link>
      </div>
    </div>
  );
}

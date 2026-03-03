'use client';

import { PublicProfileSkeleton } from '../../../../components/features/contributor-profile/public-profile-view';

export default function Loading() {
  return (
    <main className="min-h-screen bg-surface-base px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <PublicProfileSkeleton />
    </main>
  );
}

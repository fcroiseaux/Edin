'use client';

import type { PublicContributorProfile } from '@edin/shared';
import { PublicProfileView } from '../../../../components/features/contributor-profile/public-profile-view';

interface PublicProfileClientProps {
  profile: PublicContributorProfile;
}

export function PublicProfileClient({ profile }: PublicProfileClientProps) {
  return (
    <main className="min-h-screen bg-surface-base px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <PublicProfileView profile={profile} />
    </main>
  );
}

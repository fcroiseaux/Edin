'use client';

import { ContributorList } from '../../../../components/features/admin/contributors/contributor-list';

export default function AdminContributorsPage() {
  return (
    <div className="p-[var(--spacing-xl)]">
      <h1 className="mb-[var(--spacing-xl)] font-serif text-[24px] font-bold text-brand-primary">
        Contributor Management
      </h1>
      <ContributorList />
    </div>
  );
}

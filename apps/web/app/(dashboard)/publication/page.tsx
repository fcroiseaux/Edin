'use client';

import Link from 'next/link';
import { DraftList } from '../../../components/features/publication/article-list/draft-list';

export default function PublicationPage() {
  return (
    <div className="mx-auto max-w-[960px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <div className="mb-[var(--spacing-xl)] flex items-center justify-between">
        <h1 className="font-serif text-[2rem] font-bold text-brand-primary">Publication</h1>
        <Link
          href="/dashboard/publication/new"
          className="rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[15px] font-medium text-surface-raised transition-colors hover:bg-brand-accent/90"
        >
          Write
        </Link>
      </div>
      <DraftList />
    </div>
  );
}

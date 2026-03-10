'use client';

import { ActivityFeed } from '../../../../components/features/activity-feed/activity-feed';

export default function ActivityPage() {
  return (
    <main className="min-h-screen bg-surface-base px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <div className="mx-auto max-w-[56rem]">
        <h1 className="font-serif text-[28px] font-bold text-brand-primary">Activity Feed</h1>
        <p className="mt-[var(--spacing-xs)] font-serif text-[14px] text-brand-secondary">
          A stream of recent contributions across all domains.
        </p>

        <div className="mt-[var(--spacing-lg)]">
          <ActivityFeed />
        </div>
      </div>
    </main>
  );
}

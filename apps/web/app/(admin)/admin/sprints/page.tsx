'use client';

import Link from 'next/link';

export default function SprintsPage() {
  return (
    <div className="p-[var(--spacing-xl)]">
      <h1 className="mb-[var(--spacing-xl)] font-serif text-[24px] font-bold text-brand-primary">
        Sprint Dashboard
      </h1>

      <div className="space-y-[var(--spacing-lg)]">
        <section className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-sans text-[16px] font-semibold text-brand-primary">
                Zenhub Integration
              </h2>
              <p className="mt-[var(--spacing-xs)] text-[13px] text-brand-secondary">
                Configure API credentials, webhook settings, and workspace mapping
              </p>
            </div>
            <Link
              href="/admin/sprints/configuration"
              className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-lg)] py-[var(--spacing-sm)] text-[14px] font-medium text-brand-accent hover:bg-brand-accent/10"
            >
              Configure
            </Link>
          </div>
        </section>

        <section className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
          <p className="text-[14px] text-text-tertiary">
            Sprint velocity, burndown, and contributor metrics will appear here once the Zenhub
            integration is configured and data begins flowing.
          </p>
        </section>
      </div>
    </div>
  );
}

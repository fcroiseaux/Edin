export default function ComplianceLoading() {
  return (
    <main className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <div className="mb-[var(--spacing-lg)]">
        <div className="h-8 w-[280px] animate-pulse rounded bg-surface-border" />
        <div className="mt-[var(--spacing-xs)] h-4 w-[420px] animate-pulse rounded bg-surface-border" />
      </div>

      {/* Generator skeleton */}
      <div className="mb-[var(--spacing-xl)] rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
        <div className="h-5 w-[160px] animate-pulse rounded bg-surface-border" />
        <div className="mt-[var(--spacing-xs)] h-4 w-[340px] animate-pulse rounded bg-surface-border" />
        <div className="mt-[var(--spacing-lg)] h-10 w-full animate-pulse rounded bg-surface-border" />
        <div className="mt-[var(--spacing-lg)] h-[44px] w-[180px] animate-pulse rounded bg-surface-border" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
        <div className="h-5 w-[200px] animate-pulse rounded bg-surface-border" />
        <div className="mt-[var(--spacing-md)] space-y-[var(--spacing-md)]">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-surface-border" />
          ))}
        </div>
      </div>
    </main>
  );
}

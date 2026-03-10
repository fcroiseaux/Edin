export default function AuditLogsLoading() {
  return (
    <main className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <div className="mb-[var(--spacing-lg)]">
        <div className="h-8 w-48 animate-pulse rounded bg-surface-border" />
        <div className="mt-[var(--spacing-xs)] h-4 w-96 animate-pulse rounded bg-surface-border" />
      </div>
      <div className="rounded-lg border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
        <div className="space-y-[var(--spacing-md)]">
          <div className="flex gap-[var(--spacing-md)]">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-10 w-40 animate-pulse rounded bg-surface-border" />
            ))}
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-surface-border" />
          ))}
        </div>
      </div>
    </main>
  );
}

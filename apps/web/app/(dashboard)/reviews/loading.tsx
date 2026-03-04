export default function Loading() {
  return (
    <main className="min-h-screen bg-surface-base">
      <div className="mx-auto max-w-[800px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
        <div role="status" aria-label="Loading reviews">
          <div className="skeleton mb-[var(--spacing-lg)] h-[36px] w-[180px]" />
          <div className="space-y-[var(--spacing-md)]">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-md)]"
              >
                <div className="skeleton mb-[var(--spacing-sm)] h-[20px] w-[180px]" />
                <div className="skeleton mb-[var(--spacing-xs)] h-[16px] w-[120px]" />
                <div className="skeleton mt-[var(--spacing-md)] h-[36px] w-[80px]" />
              </div>
            ))}
          </div>
          <span className="sr-only">Loading your assigned reviews</span>
        </div>
      </div>
    </main>
  );
}

export default function Loading() {
  return (
    <main className="min-h-screen bg-surface-base">
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
        <div role="status" aria-label="Loading settings">
          {/* Page title skeleton */}
          <div className="skeleton mb-[var(--spacing-xl)] h-[38px] w-[160px]" />

          {/* Section title skeleton */}
          <div className="skeleton mb-[var(--spacing-md)] h-[28px] w-[200px]" />

          {/* Header skeleton */}
          <div className="mb-[var(--spacing-lg)] flex items-center justify-between">
            <div className="skeleton h-[32px] w-[280px]" />
            <div className="skeleton h-[40px] w-[200px]" />
          </div>

          {/* Table skeleton */}
          <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised">
            {/* Table header */}
            <div className="flex border-b border-surface-border px-[var(--spacing-md)] py-[var(--spacing-sm)]">
              <div className="skeleton h-[16px] w-[200px]" />
              <div className="skeleton ml-auto h-[16px] w-[80px]" />
              <div className="skeleton ml-[var(--spacing-xl)] h-[16px] w-[100px]" />
              <div className="skeleton ml-[var(--spacing-xl)] h-[16px] w-[100px]" />
              <div className="skeleton ml-[var(--spacing-xl)] h-[16px] w-[100px]" />
            </div>

            {/* Row skeletons */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center border-b border-surface-border px-[var(--spacing-md)] py-[var(--spacing-md)] last:border-b-0"
                style={{ minHeight: '48px' }}
              >
                <div className="skeleton h-[20px] w-[220px]" />
                <div className="skeleton ml-auto h-[24px] w-[70px] rounded-full" />
                <div className="skeleton ml-[var(--spacing-xl)] h-[16px] w-[90px]" />
                <div className="skeleton ml-[var(--spacing-xl)] h-[16px] w-[90px]" />
                <div className="skeleton ml-[var(--spacing-xl)] h-[32px] w-[80px]" />
              </div>
            ))}
          </div>
          <span className="sr-only">Loading settings</span>
        </div>
      </div>
    </main>
  );
}

export default function Loading() {
  return (
    <main className="min-h-screen bg-surface-base">
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
        <div className="skeleton h-[32px] w-[300px]" />
        <div className="mt-[var(--spacing-xs)] skeleton h-[16px] w-[250px]" />
        <div className="mt-[var(--spacing-2xl)] space-y-[var(--spacing-lg)]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-md)]"
            >
              <div className="flex items-center justify-between">
                <div className="skeleton h-[16px] w-[140px]" />
                <div className="skeleton h-[28px] w-[80px]" />
              </div>
              <div className="mt-[var(--spacing-sm)] skeleton h-[14px] w-full" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function Loading() {
  return (
    <main className="min-h-screen bg-surface-base">
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
        <div className="skeleton h-[32px] w-[200px]" />
        <div className="mt-[var(--spacing-xs)] skeleton h-[16px] w-[300px]" />
        <div className="mt-[var(--spacing-2xl)] rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
          <div className="skeleton h-[20px] w-[160px]" />
          <div className="mt-[var(--spacing-lg)] grid gap-[var(--spacing-md)] sm:grid-cols-2">
            <div className="skeleton h-[40px] w-full" />
            <div className="skeleton h-[40px] w-full" />
          </div>
          <div className="mt-[var(--spacing-lg)] skeleton h-[120px] w-full" />
        </div>
      </div>
    </main>
  );
}

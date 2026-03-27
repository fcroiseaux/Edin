export default function AdminPrizesLoading() {
  return (
    <main>
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
        <div className="skeleton h-[32px] w-[250px]" />
        <div className="mt-[var(--spacing-xs)] skeleton h-[16px] w-[350px]" />
        <div className="mt-[var(--spacing-xl)] grid gap-[var(--spacing-md)] sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-md)]"
            >
              <div className="skeleton h-[14px] w-[100px]" />
              <div className="mt-[var(--spacing-sm)] skeleton h-[28px] w-[60px]" />
            </div>
          ))}
        </div>
        <div className="mt-[var(--spacing-lg)] rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-md)]">
          <div className="skeleton h-[16px] w-[140px]" />
          <div className="mt-[var(--spacing-md)] space-y-[var(--spacing-sm)]">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-[44px] w-full rounded-[var(--radius-md)]" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

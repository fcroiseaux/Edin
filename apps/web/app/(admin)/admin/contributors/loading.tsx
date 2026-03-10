export default function ContributorsLoading() {
  return (
    <div className="p-[var(--spacing-xl)]">
      <div className="mb-[var(--spacing-xl)] h-[32px] w-[280px] animate-pulse rounded-[var(--radius-md)] bg-surface-border" />
      <div className="mb-[var(--spacing-lg)] flex gap-[var(--spacing-md)]">
        <div className="h-[40px] flex-1 animate-pulse rounded-[var(--radius-md)] bg-surface-border" />
        <div className="h-[40px] w-[150px] animate-pulse rounded-[var(--radius-md)] bg-surface-border" />
        <div className="h-[40px] w-[150px] animate-pulse rounded-[var(--radius-md)] bg-surface-border" />
      </div>
      <div className="space-y-[var(--spacing-sm)]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="h-[48px] animate-pulse rounded-[var(--radius-md)] bg-surface-border"
          />
        ))}
      </div>
    </div>
  );
}

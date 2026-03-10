export default function SettingsLoading() {
  return (
    <div className="p-[var(--spacing-xl)]">
      <div className="mb-[var(--spacing-xl)] h-[32px] w-[220px] animate-pulse rounded-[var(--radius-md)] bg-surface-border" />
      <div className="space-y-[var(--spacing-lg)]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[200px] animate-pulse rounded-[var(--radius-lg)] bg-surface-border"
          />
        ))}
      </div>
    </div>
  );
}

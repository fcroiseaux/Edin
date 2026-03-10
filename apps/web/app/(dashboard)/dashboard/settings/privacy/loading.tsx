export default function PrivacySettingsLoading() {
  return (
    <div className="p-[var(--spacing-xl)]">
      <div className="skeleton h-[28px] w-[260px]" />
      <div className="mt-[var(--spacing-xs)] skeleton h-[16px] w-[420px]" />

      <div className="mt-[var(--spacing-xl)] space-y-[var(--spacing-lg)]">
        {/* Export section skeleton */}
        <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
          <div className="skeleton h-[18px] w-[140px]" />
          <div className="mt-[var(--spacing-xs)] skeleton h-[14px] w-full" />
          <div className="mt-[var(--spacing-xs)] skeleton h-[14px] w-[75%]" />
          <div className="mt-[var(--spacing-lg)] skeleton h-[44px] w-[180px] rounded-[var(--radius-md)]" />
        </div>

        {/* Deletion section skeleton */}
        <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
          <div className="skeleton h-[18px] w-[180px]" />
          <div className="mt-[var(--spacing-xs)] skeleton h-[14px] w-full" />
          <div className="mt-[var(--spacing-xs)] skeleton h-[14px] w-[65%]" />
          <div className="mt-[var(--spacing-lg)] skeleton h-[44px] w-[200px] rounded-[var(--radius-md)]" />
        </div>
      </div>
    </div>
  );
}

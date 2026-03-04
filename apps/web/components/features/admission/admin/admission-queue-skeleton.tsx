'use client';

export function AdmissionQueueSkeleton() {
  return (
    <div role="status" aria-label="Loading admission queue">
      {/* Header skeleton */}
      <div className="mb-[var(--spacing-lg)] flex items-center justify-between">
        <div className="skeleton h-[32px] w-[240px]" />
        <div className="flex gap-[var(--spacing-sm)]">
          <div className="skeleton h-[40px] w-[160px]" />
          <div className="skeleton h-[40px] w-[160px]" />
        </div>
      </div>

      {/* Table header skeleton */}
      <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised">
        <div className="flex border-b border-surface-border px-[var(--spacing-md)] py-[var(--spacing-sm)]">
          <div className="skeleton h-[16px] w-[120px]" />
          <div className="skeleton ml-auto h-[16px] w-[80px]" />
          <div className="skeleton ml-[var(--spacing-xl)] h-[16px] w-[100px]" />
          <div className="skeleton ml-[var(--spacing-xl)] h-[16px] w-[100px]" />
          <div className="skeleton ml-[var(--spacing-xl)] h-[16px] w-[80px]" />
        </div>

        {/* Table row skeletons */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center border-b border-surface-border px-[var(--spacing-md)] py-[var(--spacing-md)]"
          >
            <div className="skeleton h-[20px] w-[180px]" />
            <div className="skeleton ml-auto h-[24px] w-[80px] rounded-full" />
            <div className="skeleton ml-[var(--spacing-xl)] h-[16px] w-[90px]" />
            <div className="skeleton ml-[var(--spacing-xl)] h-[24px] w-[60px] rounded-full" />
            <div className="skeleton ml-[var(--spacing-xl)] h-[24px] w-[90px] rounded-full" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading admission queue data</span>
    </div>
  );
}

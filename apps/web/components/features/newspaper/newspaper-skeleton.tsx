'use client';

export function NewspaperSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading newspaper"
      className="mx-auto max-w-[1200px] px-6 py-8 animate-pulse"
    >
      {/* Headline skeleton */}
      <div className="rounded-radius-lg bg-surface-raised p-6 md:p-8 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-surface-subtle shrink-0" />
          <div className="flex-1">
            <div className="flex gap-2 mb-3">
              <div className="w-20 h-5 rounded-full bg-surface-subtle" />
              <div className="w-16 h-5 rounded-full bg-surface-subtle" />
            </div>
            <div className="w-3/4 h-8 rounded bg-surface-subtle mb-3" />
            <div className="w-full h-4 rounded bg-surface-subtle mb-2" />
            <div className="w-2/3 h-4 rounded bg-surface-subtle mb-4" />
            <div className="w-40 h-3 rounded bg-surface-subtle" />
          </div>
        </div>
      </div>

      {/* Grid + sidebar skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-radius-md bg-surface-raised p-4">
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-surface-subtle shrink-0" />
                <div className="flex-1">
                  <div className="flex gap-1.5 mb-2">
                    <div className="w-16 h-4 rounded-full bg-surface-subtle" />
                    <div className="w-12 h-4 rounded-full bg-surface-subtle" />
                  </div>
                  <div className="w-full h-5 rounded bg-surface-subtle mb-1.5" />
                  <div className="w-2/3 h-3 rounded bg-surface-subtle mb-2" />
                  <div className="w-32 h-3 rounded bg-surface-subtle" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar skeleton */}
        <div className="rounded-radius-lg bg-surface-raised p-6 hidden lg:block">
          <div className="w-32 h-6 rounded bg-surface-subtle mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <div className="w-20 h-3 rounded bg-surface-subtle mb-1" />
                <div className="w-full h-4 rounded bg-surface-subtle" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useAdminPrizeOverview } from '../../../../hooks/use-prize-awards';

const SIGNIFICANCE_LABELS: Record<number, string> = {
  1: 'Notable',
  2: 'Significant',
  3: 'Exceptional',
};

function PrizesSkeleton() {
  return (
    <div className="space-y-[var(--spacing-lg)]">
      <div className="grid gap-[var(--spacing-md)] sm:grid-cols-2 lg:grid-cols-3">
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
      <div className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-md)]">
        <div className="skeleton h-[16px] w-[140px]" />
        <div className="mt-[var(--spacing-md)] space-y-[var(--spacing-sm)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-[44px] w-full rounded-[var(--radius-md)]" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminPrizesPage() {
  const { overview, isLoading } = useAdminPrizeOverview();

  return (
    <main>
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
        <h1 className="font-serif text-[28px] font-bold text-text-primary">Prize Administration</h1>
        <p className="mt-[var(--spacing-xs)] font-serif text-[14px] text-text-secondary">
          Overview of all prize awards across the platform.
        </p>

        {isLoading || !overview ? (
          <div className="mt-[var(--spacing-xl)]">
            <PrizesSkeleton />
          </div>
        ) : (
          <div className="mt-[var(--spacing-xl)] space-y-[var(--spacing-lg)]">
            {/* Summary Stats */}
            <div className="grid gap-[var(--spacing-md)] sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-md)]">
                <p className="font-sans text-[13px] text-text-secondary">Last 30 Days</p>
                <p className="mt-[var(--spacing-xs)] font-serif text-[28px] font-bold text-text-primary">
                  {overview.last30DaysCount}
                </p>
              </div>
              {overview.totalByCategory.map((cat) => (
                <div
                  key={cat.prizeCategoryId}
                  className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-md)]"
                >
                  <p className="font-sans text-[13px] text-text-secondary">
                    {cat.prizeCategoryName}
                  </p>
                  <p className="mt-[var(--spacing-xs)] font-serif text-[28px] font-bold text-text-primary">
                    {cat.count}
                  </p>
                </div>
              ))}
            </div>

            {/* Awards by Channel */}
            {overview.totalByChannel.length > 0 && (
              <section className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
                <h2 className="font-sans text-[16px] font-medium text-text-primary">
                  Awards by Channel
                </h2>
                <div className="mt-[var(--spacing-md)] grid gap-[var(--spacing-sm)] sm:grid-cols-2 lg:grid-cols-4">
                  {overview.totalByChannel.map((ch) => (
                    <div
                      key={ch.channelId}
                      className="flex items-center justify-between rounded-[var(--radius-md)] border border-surface-subtle p-[var(--spacing-md)]"
                    >
                      <span className="font-sans text-[14px] text-text-primary">
                        {ch.channelName}
                      </span>
                      <span className="font-serif text-[18px] font-bold text-text-primary">
                        {ch.count}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Recent Awards Table */}
            <section className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
              <h2 className="font-sans text-[16px] font-medium text-text-primary">Recent Awards</h2>
              {overview.recentAwards.length > 0 ? (
                <div className="mt-[var(--spacing-md)] overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-surface-subtle">
                        <th className="pb-[var(--spacing-sm)] font-sans text-[12px] font-medium uppercase tracking-wider text-text-secondary">
                          Contributor
                        </th>
                        <th className="pb-[var(--spacing-sm)] font-sans text-[12px] font-medium uppercase tracking-wider text-text-secondary">
                          Category
                        </th>
                        <th className="pb-[var(--spacing-sm)] font-sans text-[12px] font-medium uppercase tracking-wider text-text-secondary">
                          Channel
                        </th>
                        <th className="pb-[var(--spacing-sm)] font-sans text-[12px] font-medium uppercase tracking-wider text-text-secondary">
                          Level
                        </th>
                        <th className="pb-[var(--spacing-sm)] font-sans text-[12px] font-medium uppercase tracking-wider text-text-secondary">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.recentAwards.map((award) => (
                        <tr
                          key={award.id}
                          className="border-b border-surface-subtle last:border-b-0"
                        >
                          <td className="py-[var(--spacing-sm)] font-serif text-[14px] text-text-primary">
                            {award.contributorName}
                          </td>
                          <td className="py-[var(--spacing-sm)] font-sans text-[13px] text-text-primary">
                            {award.prizeCategoryName}
                          </td>
                          <td className="py-[var(--spacing-sm)] font-sans text-[13px] text-text-secondary">
                            {award.channelName}
                          </td>
                          <td className="py-[var(--spacing-sm)] font-sans text-[13px] text-text-secondary">
                            {SIGNIFICANCE_LABELS[award.significanceLevel] ?? 'Unknown'}
                          </td>
                          <td className="py-[var(--spacing-sm)] font-sans text-[12px] text-text-tertiary">
                            {new Date(award.awardedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-[var(--spacing-sm)] font-serif text-[15px] leading-[1.65] text-text-secondary">
                  No prize awards have been made yet.
                </p>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

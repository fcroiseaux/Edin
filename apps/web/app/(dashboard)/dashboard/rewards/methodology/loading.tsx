import { RewardsHeroSkeleton } from '../../../../../components/features/rewards/rewards-hero';

export default function DashboardMethodologyLoading() {
  return (
    <main className="min-h-screen bg-surface-base">
      <RewardsHeroSkeleton />
      <div className="mx-auto max-w-[720px] space-y-[var(--spacing-xl)] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <div className="space-y-[var(--spacing-md)]">
          <div className="skeleton h-[28px] w-[320px]" />
          <div className="skeleton h-[60px] w-full" />
        </div>
        <div className="skeleton h-[320px] w-full rounded-[var(--radius-lg)]" />
        <div className="space-y-[var(--spacing-md)]">
          <div className="skeleton h-[120px] w-full rounded-[var(--radius-lg)]" />
          <div className="skeleton h-[120px] w-full rounded-[var(--radius-lg)]" />
          <div className="skeleton h-[120px] w-full rounded-[var(--radius-lg)]" />
        </div>
        <div className="skeleton h-[300px] w-full rounded-[var(--radius-lg)]" />
      </div>
    </main>
  );
}

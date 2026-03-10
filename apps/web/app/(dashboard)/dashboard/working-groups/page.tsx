'use client';

import { useWorkingGroups, useJoinWorkingGroup } from '../../../../hooks/use-working-groups';
import { WorkingGroupCard } from '../../../../components/features/working-group/working-group-card';

function WorkingGroupsSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-[var(--spacing-lg)] md:grid-cols-2"
      aria-label="Loading working groups"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]"
        >
          <div className="flex items-start justify-between">
            <div className="skeleton h-[22px] w-[80px] rounded-full" />
            <div className="skeleton h-[18px] w-[70px]" />
          </div>
          <div className="mt-[var(--spacing-md)] skeleton h-[24px] w-[200px]" />
          <div className="mt-[var(--spacing-sm)] space-y-[var(--spacing-xs)]">
            <div className="skeleton h-[16px] w-full" />
            <div className="skeleton h-[16px] w-3/4" />
          </div>
          <div className="mt-[var(--spacing-lg)] skeleton h-[44px] w-full rounded-[var(--radius-md)]" />
        </div>
      ))}
    </div>
  );
}

export default function WorkingGroupsPage() {
  const { workingGroups, isLoading } = useWorkingGroups();
  const joinMutation = useJoinWorkingGroup();

  if (isLoading) {
    return (
      <main className="min-h-screen bg-surface-base px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <div className="mx-auto max-w-[56rem]">
          <div className="skeleton h-[32px] w-[250px]" />
          <div className="mt-[var(--spacing-xs)] skeleton h-[20px] w-[400px]" />
          <div className="mt-[var(--spacing-xl)]">
            <WorkingGroupsSkeleton />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-base px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <div className="mx-auto max-w-[56rem]">
        <h1 className="font-serif text-[32px] leading-[1.25] font-bold text-brand-primary">
          Working Groups
        </h1>
        <p className="mt-[var(--spacing-xs)] font-serif text-[16px] leading-[1.65] text-brand-secondary">
          Connect with contributors in your area of expertise and access domain-relevant
          opportunities.
        </p>

        <div className="mt-[var(--spacing-xl)] grid grid-cols-1 gap-[var(--spacing-lg)] md:grid-cols-2">
          {workingGroups.map((group) => (
            <WorkingGroupCard
              key={group.id}
              group={group}
              isMember={group.isMember}
              onJoin={(id) => joinMutation.mutate(id)}
              isJoining={joinMutation.isPending && joinMutation.variables === group.id}
            />
          ))}
        </div>

        {!isLoading && workingGroups.length === 0 && (
          <div className="mt-[var(--spacing-xl)] rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-2xl)] text-center">
            <p className="font-sans text-[15px] text-brand-secondary">
              No working groups available yet.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

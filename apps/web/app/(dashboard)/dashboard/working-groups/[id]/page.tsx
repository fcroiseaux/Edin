'use client';

import { use } from 'react';
import { useWorkingGroupDetail } from '../../../../../hooks/use-working-groups';
import { WorkingGroupDetail } from '../../../../../components/features/working-group/working-group-detail';

function WorkingGroupDetailSkeleton() {
  return (
    <main className="min-h-screen bg-surface-base px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <div className="mx-auto max-w-[56rem]">
        <div className="skeleton h-[16px] w-[160px]" />
        <div className="mt-[var(--spacing-sm)] skeleton h-[36px] w-[300px]" />
        <div className="mt-[var(--spacing-xs)] flex gap-[var(--spacing-sm)]">
          <div className="skeleton h-[22px] w-[80px] rounded-full" />
          <div className="skeleton h-[18px] w-[80px]" />
        </div>
        <div className="mt-[var(--spacing-md)] space-y-[var(--spacing-xs)]">
          <div className="skeleton h-[18px] w-full" />
          <div className="skeleton h-[18px] w-3/4" />
        </div>
        <div className="mt-[var(--spacing-2xl)]">
          <div className="skeleton h-[24px] w-[100px]" />
          <div className="mt-[var(--spacing-md)] space-y-[var(--spacing-sm)]">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-[var(--spacing-md)] rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-sm)]"
              >
                <div className="skeleton h-[40px] w-[40px] rounded-full" />
                <div className="flex-1">
                  <div className="skeleton h-[16px] w-[120px]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function WorkingGroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { workingGroup, isLoading } = useWorkingGroupDetail(id);

  if (isLoading || !workingGroup) {
    return <WorkingGroupDetailSkeleton />;
  }

  return <WorkingGroupDetail group={workingGroup} isLoading={false} />;
}

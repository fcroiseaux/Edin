'use client';

import { useState } from 'react';
import { useTasks, useClaimTask } from '../../../../hooks/use-tasks';
import { TaskList } from '../../../../components/features/task/task-list';
import { TaskFilters } from '../../../../components/features/task/task-filters';
import { useToast } from '../../../../components/ui/toast';

function TaskListSkeleton() {
  return (
    <div className="space-y-[var(--spacing-sm)]">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="skeleton h-[18px] w-[200px]" />
              <div className="mt-[var(--spacing-xs)] skeleton h-[16px] w-full" />
              <div className="mt-[var(--spacing-xs)] skeleton h-[16px] w-3/4" />
            </div>
            <div className="skeleton h-[44px] w-[80px] rounded-[8px]" />
          </div>
          <div className="mt-[var(--spacing-sm)] flex gap-[var(--spacing-sm)]">
            <div className="skeleton h-[22px] w-[80px] rounded-full" />
            <div className="skeleton h-[22px] w-[80px] rounded-full" />
            <div className="skeleton h-[16px] w-[60px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function TasksPage() {
  const [domain, setDomain] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [status, setStatus] = useState('');
  const [claimingTaskId, setClaimingTaskId] = useState<string | undefined>();

  const filters = {
    ...(domain && { domain }),
    ...(difficulty && { difficulty }),
    ...(status && { status }),
  };

  const { tasks, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } = useTasks(filters);
  const claimMutation = useClaimTask();
  const { toast } = useToast();

  const handleClaim = (taskId: string) => {
    setClaimingTaskId(taskId);
    claimMutation.mutate(taskId, {
      onSuccess: () => {
        toast({ title: 'Task claimed.' });
        setClaimingTaskId(undefined);
      },
      onError: (error) => {
        toast({ title: error.message, variant: 'error' });
        setClaimingTaskId(undefined);
      },
    });
  };

  return (
    <main className="min-h-screen bg-surface-base px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <div className="mx-auto max-w-[56rem]">
        <h1 className="font-serif text-[28px] font-bold text-brand-primary">Contribution Menu</h1>
        <p className="mt-[var(--spacing-xs)] font-serif text-[14px] text-brand-secondary">
          Browse available tasks and find work matched to your skills.
        </p>

        <div className="mt-[var(--spacing-lg)]">
          <TaskFilters
            domain={domain}
            difficulty={difficulty}
            status={status}
            onDomainChange={setDomain}
            onDifficultyChange={setDifficulty}
            onStatusChange={setStatus}
          />
        </div>

        <div className="mt-[var(--spacing-lg)]">
          {isPending ? (
            <TaskListSkeleton />
          ) : (
            <TaskList
              tasks={tasks}
              onClaim={handleClaim}
              isClaimPending={claimMutation.isPending}
              claimingTaskId={claimingTaskId}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              fetchNextPage={fetchNextPage}
            />
          )}
        </div>
      </div>
    </main>
  );
}

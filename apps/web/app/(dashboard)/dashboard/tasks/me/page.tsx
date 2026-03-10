'use client';

import { useState } from 'react';
import { useMyTasks, useUpdateTaskStatus } from '../../../../../hooks/use-tasks';
import { MyTaskCard } from '../../../../../components/features/task/my-task-card';
import { useToast } from '../../../../../components/ui/toast';

function MyTasksSkeleton() {
  return (
    <div className="space-y-[var(--spacing-sm)]">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]"
        >
          <div className="skeleton h-[18px] w-[200px]" />
          <div className="mt-[var(--spacing-xs)] skeleton h-[16px] w-full" />
          <div className="mt-[var(--spacing-sm)] flex gap-[var(--spacing-sm)]">
            <div className="skeleton h-[22px] w-[80px] rounded-full" />
            <div className="skeleton h-[16px] w-[60px]" />
          </div>
          <div className="mt-[var(--spacing-md)] flex gap-[var(--spacing-sm)]">
            <div className="skeleton h-[14px] w-[50px]" />
            <div className="skeleton h-[14px] w-[60px]" />
            <div className="skeleton h-[14px] w-[60px]" />
            <div className="skeleton h-[14px] w-[50px]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MyTasksPage() {
  const { tasks, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } = useMyTasks();
  const updateStatusMutation = useUpdateTaskStatus();
  const { toast } = useToast();
  const [updatingTaskId, setUpdatingTaskId] = useState<string | undefined>();

  const handleStartWorking = (taskId: string) => {
    setUpdatingTaskId(taskId);
    updateStatusMutation.mutate(
      { taskId, status: 'IN_PROGRESS' },
      {
        onSuccess: () => {
          toast({ title: 'Task status updated.' });
          setUpdatingTaskId(undefined);
        },
        onError: (error) => {
          toast({ title: error.message, variant: 'error' });
          setUpdatingTaskId(undefined);
        },
      },
    );
  };

  return (
    <main className="min-h-screen bg-surface-base px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <div className="mx-auto max-w-[56rem]">
        <h1 className="font-serif text-[28px] font-bold text-brand-primary">My Tasks</h1>
        <p className="mt-[var(--spacing-xs)] font-serif text-[14px] text-brand-secondary">
          Tasks you have claimed and their progress.
        </p>

        <div className="mt-[var(--spacing-lg)]">
          {isPending ? (
            <MyTasksSkeleton />
          ) : tasks.length === 0 ? (
            <p className="py-[var(--spacing-2xl)] text-center font-serif text-[14px] text-brand-secondary">
              You have not claimed any tasks yet. Browse the contribution menu to find work.
            </p>
          ) : (
            <div className="space-y-[var(--spacing-sm)]" role="list" aria-label="My tasks">
              {tasks.map((task) => (
                <MyTaskCard
                  key={task.id}
                  task={task}
                  onStartWorking={handleStartWorking}
                  isUpdatePending={updateStatusMutation.isPending && updatingTaskId === task.id}
                />
              ))}
            </div>
          )}

          {hasNextPage && !isFetchingNextPage && (
            <div className="mt-[var(--spacing-md)] text-center">
              <button
                type="button"
                onClick={() => fetchNextPage()}
                className="font-sans text-[14px] text-brand-secondary hover:text-brand-primary"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

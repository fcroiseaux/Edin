'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { WorkingGroupMember, AnnouncementDto } from '@edin/shared';
import { MemberList } from './member-list';
import { AnnouncementBanner } from './announcement-banner';
import { WgLeadDashboard } from './wg-lead-dashboard';
import { useLeaveWorkingGroup } from '../../../hooks/use-working-groups';
import { useLeadDashboard } from '../../../hooks/use-working-group-lead';
import {
  useTasks,
  useClaimTask,
  useCreateTask,
  useUpdateTask,
  useRetireTask,
} from '../../../hooks/use-tasks';
import { useAuth } from '../../../hooks/use-auth';
import { useToast } from '../../ui/toast';
import { TaskCard } from '../task/task-card';
import { CreateTaskForm } from '../task/create-task-form';

const DOMAIN_TINT: Record<string, string> = {
  Technology: 'bg-[#3A7D7E]/3',
  Fintech: 'bg-[#C49A3C]/3',
  Impact: 'bg-[#B06B6B]/3',
  Governance: 'bg-[#7B6B8A]/3',
};

const DOMAIN_BADGE: Record<string, string> = {
  Technology: 'bg-domain-technology text-white',
  Fintech: 'bg-domain-fintech text-brand-primary',
  Impact: 'bg-domain-impact text-brand-primary',
  Governance: 'bg-domain-governance text-white',
};

interface Contribution {
  id: string;
  title: string;
  contributionType: string;
  createdAt: string;
  contributor: { id: string; name: string; avatarUrl: string | null };
  repository: { fullName: string };
}

interface WorkingGroupDetailProps {
  group: {
    id: string;
    name: string;
    description: string;
    domain: string;
    accentColor: string;
    memberCount: number;
    isMember: boolean;
    leadContributor?: { id: string; name: string; avatarUrl: string | null } | null;
    members: WorkingGroupMember[];
    announcements?: AnnouncementDto[];
    recentContributions: Contribution[];
    activeTasks: Array<{
      id: string;
      title: string;
      description: string;
      estimatedEffort: string;
      submissionFormat: string;
    }>;
  };
  isLoading: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  COMMIT: 'Commit',
  PULL_REQUEST: 'Pull Request',
  CODE_REVIEW: 'Code Review',
};

export function WorkingGroupDetail({ group, isLoading }: WorkingGroupDetailProps) {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const leaveMutation = useLeaveWorkingGroup();
  const { tasks: domainTasks, isPending: isTasksPending } = useTasks({ domain: group.domain });
  const claimMutation = useClaimTask();
  const createTaskMutation = useCreateTask();
  const updateTaskMutation = useUpdateTask();
  const retireTaskMutation = useRetireTask();
  const { user } = useAuth();
  const { toast } = useToast();
  const tint = DOMAIN_TINT[group.domain] ?? '';
  const badge = DOMAIN_BADGE[group.domain] ?? '';
  const canManageTasks = user?.role === 'ADMIN' || user?.role === 'WORKING_GROUP_LEAD';
  const isGroupLead = group.leadContributor?.id === user?.id;
  const editingTask = domainTasks.find((task) => task.id === editingTaskId) ?? null;
  const { dashboard } = useLeadDashboard(isGroupLead ? group.id : '');
  const latestAnnouncement = group.announcements?.[0] ?? null;

  const handleTaskCreate = (data: {
    title: string;
    description: string;
    domain: string;
    difficulty: string;
    estimatedEffort: string;
  }) => {
    createTaskMutation.mutate(
      { ...data, domain: group.domain },
      {
        onSuccess: () => toast({ title: 'Task created.' }),
        onError: (error) => toast({ title: error.message, variant: 'error' }),
      },
    );
  };

  const handleTaskUpdate = (data: {
    title: string;
    description: string;
    domain: string;
    difficulty: string;
    estimatedEffort: string;
  }) => {
    if (!editingTask) return;

    updateTaskMutation.mutate(
      {
        taskId: editingTask.id,
        data: { ...data, domain: group.domain },
      },
      {
        onSuccess: () => {
          toast({ title: 'Task updated.' });
          setEditingTaskId(null);
        },
        onError: (error) => toast({ title: error.message, variant: 'error' }),
      },
    );
  };

  const handleTaskRetire = (taskId: string) => {
    retireTaskMutation.mutate(taskId, {
      onSuccess: () => {
        toast({ title: 'Task retired.' });
        if (editingTaskId === taskId) {
          setEditingTaskId(null);
        }
      },
      onError: (error) => toast({ title: error.message, variant: 'error' }),
    });
  };

  return (
    <div className={`min-h-screen ${tint}`}>
      <div className="mx-auto max-w-[56rem] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Link
              href="/dashboard/working-groups"
              className="font-sans text-[14px] text-brand-secondary hover:text-brand-primary"
            >
              &larr; Back to Working Groups
            </Link>
            <h1 className="mt-[var(--spacing-sm)] font-serif text-[32px] leading-[1.25] font-bold text-brand-primary">
              {group.name}
            </h1>
            <div className="mt-[var(--spacing-xs)] flex items-center gap-[var(--spacing-sm)]">
              <span
                className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${badge}`}
              >
                {group.domain}
              </span>
              <span className="font-sans text-[13px] text-brand-secondary">
                {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
              </span>
            </div>
          </div>

          {group.isMember && (
            <button
              type="button"
              onClick={() => leaveMutation.mutate(group.id)}
              disabled={leaveMutation.isPending}
              className="inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-md)] font-sans text-[14px] font-medium text-brand-secondary transition-colors duration-[var(--transition-fast)] hover:bg-surface-sunken disabled:opacity-50"
              aria-label={`Leave ${group.name} working group`}
            >
              {leaveMutation.isPending ? 'Leaving...' : 'Leave Group'}
            </button>
          )}
        </div>

        <p className="mt-[var(--spacing-md)] font-serif text-[16px] leading-[1.65] text-brand-secondary">
          {group.description}
        </p>

        {/* Announcement Banner */}
        {latestAnnouncement && (
          <div className="mt-[var(--spacing-lg)]">
            <AnnouncementBanner announcement={latestAnnouncement} accentColor={group.accentColor} />
          </div>
        )}

        {/* Members Section */}
        <section className="mt-[var(--spacing-2xl)]">
          <h2 className="font-sans text-[18px] font-medium text-brand-primary">Members</h2>
          <div className="mt-[var(--spacing-md)]">
            <MemberList members={group.members} isLoading={isLoading} />
          </div>
        </section>

        {/* Recent Contributions Section */}
        <section className="mt-[var(--spacing-2xl)]">
          <h2 className="font-sans text-[18px] font-medium text-brand-primary">
            Recent Contributions
          </h2>
          <div className="mt-[var(--spacing-md)]">
            {group.recentContributions.length === 0 ? (
              <p className="font-serif text-[14px] text-brand-secondary">
                No contributions from group members yet.
              </p>
            ) : (
              <div
                className="space-y-[var(--spacing-xs)]"
                role="list"
                aria-label="Recent contributions"
              >
                {group.recentContributions.map((c) => (
                  <div
                    key={c.id}
                    role="listitem"
                    className="flex items-center gap-[var(--spacing-md)] rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-sm)]"
                  >
                    <div className="flex-1">
                      <p className="font-sans text-[14px] font-medium text-brand-primary">
                        {c.title}
                      </p>
                      <p className="font-sans text-[12px] text-brand-secondary">
                        {c.contributor.name} &middot;{' '}
                        {TYPE_LABELS[c.contributionType] ?? c.contributionType} &middot;{' '}
                        {c.repository.fullName}
                      </p>
                    </div>
                    <span className="font-sans text-[12px] text-brand-secondary">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-[var(--spacing-2xl)]">
          <h2 className="font-sans text-[18px] font-medium text-brand-primary">Active Tasks</h2>
          <div className="mt-[var(--spacing-md)]">
            {canManageTasks ? (
              <div className="mb-[var(--spacing-lg)]">
                <CreateTaskForm
                  onSubmit={editingTask ? handleTaskUpdate : handleTaskCreate}
                  isPending={createTaskMutation.isPending || updateTaskMutation.isPending}
                  initialValues={
                    editingTask
                      ? {
                          title: editingTask.title,
                          description: editingTask.description,
                          domain: editingTask.domain,
                          difficulty: editingTask.difficulty,
                          estimatedEffort: editingTask.estimatedEffort,
                        }
                      : {
                          title: '',
                          description: '',
                          domain: group.domain,
                          difficulty: 'BEGINNER',
                          estimatedEffort: '',
                        }
                  }
                  submitLabel={editingTask ? 'Save Changes' : 'Create Task'}
                  heading={editingTask ? 'Edit Domain Task' : 'Create Domain Task'}
                  onCancel={editingTask ? () => setEditingTaskId(null) : undefined}
                />
              </div>
            ) : null}

            {isTasksPending ? (
              <div className="space-y-[var(--spacing-sm)]">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]"
                  >
                    <div className="skeleton h-[18px] w-[200px]" />
                    <div className="mt-[var(--spacing-xs)] skeleton h-[16px] w-full" />
                    <div className="mt-[var(--spacing-sm)] flex gap-[var(--spacing-sm)]">
                      <div className="skeleton h-[22px] w-[80px] rounded-full" />
                      <div className="skeleton h-[22px] w-[80px] rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : domainTasks.length === 0 ? (
              <p className="font-serif text-[14px] text-brand-secondary">
                No active tasks are tagged for this domain yet.
              </p>
            ) : (
              <div className="space-y-[var(--spacing-sm)]" role="list" aria-label="Active tasks">
                {domainTasks.map((task) => (
                  <div key={task.id} className="space-y-[var(--spacing-xs)]">
                    {canManageTasks ? (
                      <div className="flex justify-end gap-[var(--spacing-xs)]">
                        <button
                          type="button"
                          onClick={() => setEditingTaskId(task.id)}
                          className="inline-flex min-h-[36px] items-center rounded-[8px] border border-surface-border px-[var(--spacing-sm)] font-sans text-[13px] text-brand-secondary transition-colors duration-200 hover:bg-surface-sunken"
                        >
                          Edit
                        </button>
                        {task.status !== 'RETIRED' ? (
                          <button
                            type="button"
                            onClick={() => handleTaskRetire(task.id)}
                            disabled={retireTaskMutation.isPending}
                            className="inline-flex min-h-[36px] items-center rounded-[8px] border border-surface-border px-[var(--spacing-sm)] font-sans text-[13px] text-brand-secondary transition-colors duration-200 hover:bg-surface-sunken disabled:opacity-50"
                          >
                            Retire
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    <TaskCard
                      task={task}
                      onClaim={(taskId) => claimMutation.mutate(taskId)}
                      isClaimPending={claimMutation.isPending}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* WG Lead Dashboard (shown only for the assigned lead) */}
        {isGroupLead && dashboard && (
          <section className="mt-[var(--spacing-2xl)]">
            <h2 className="font-sans text-[18px] font-medium text-brand-primary">Lead Dashboard</h2>
            <div className="mt-[var(--spacing-md)]">
              <WgLeadDashboard
                workingGroupId={group.id}
                domain={group.domain}
                healthIndicators={dashboard.healthIndicators}
                announcements={dashboard.announcements}
                members={dashboard.members}
                tasks={dashboard.tasks.map((t) => ({
                  id: t.id,
                  title: t.title,
                  status: t.status,
                  sortOrder: t.sortOrder,
                }))}
                currentUserId={user?.id ?? ''}
                isAdmin={user?.role === 'ADMIN'}
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

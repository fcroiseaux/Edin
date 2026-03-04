'use client';

import { useState } from 'react';
import * as Select from '@radix-ui/react-select';
import type { MicroTask } from '@edin/shared';
import { useMicroTaskList } from '../../../../hooks/use-micro-task-admin';
import { DOMAIN_COLORS } from '../../../../lib/domain-colors';
import { MicroTaskFormPanel } from './micro-task-form-panel';
import { MicroTaskStatusToggle } from './micro-task-status-toggle';

const DOMAINS = ['Technology', 'Fintech', 'Impact', 'Governance'];

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function MicroTaskList() {
  const [domain, setDomain] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editTask, setEditTask] = useState<MicroTask | null>(null);

  const { microTasks, isLoading } = useMicroTaskList({
    domain: domain ?? undefined,
  });

  const handleRowClick = (task: MicroTask) => {
    setEditTask(task);
    setFormOpen(true);
  };

  const handleCreate = () => {
    setEditTask(null);
    setFormOpen(true);
  };

  // Sort: active first, then by createdAt DESC (server already does domain ASC + createdAt DESC)
  const sortedTasks = [...microTasks].sort((a, b) => {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  if (isLoading) {
    return <MicroTaskListSkeleton />;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-[var(--spacing-lg)] flex flex-col gap-[var(--spacing-md)] sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-[28px] font-bold text-brand-primary">
          Micro-Task Configuration
        </h1>
        <div className="flex flex-wrap gap-[var(--spacing-sm)]">
          {/* Domain filter */}
          <Select.Root
            value={domain ?? ''}
            onValueChange={(val) => setDomain(val === 'all' ? null : val)}
          >
            <Select.Trigger
              className="flex min-h-[40px] min-w-[160px] items-center justify-between rounded-[var(--radius-md)] border border-surface-border-input bg-surface-raised px-[var(--spacing-sm)] py-[var(--spacing-xs)] font-sans text-[14px] text-brand-primary outline-none transition-[border-color] duration-[var(--transition-fast)] focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
              aria-label="Filter by domain"
            >
              <Select.Value placeholder="All Domains" />
              <Select.Icon className="ml-[var(--spacing-xs)] text-brand-secondary">
                <ChevronDownIcon />
              </Select.Icon>
            </Select.Trigger>
            <Select.Portal>
              <Select.Content
                className="z-50 overflow-hidden rounded-[var(--radius-md)] border border-surface-border bg-surface-raised shadow-[var(--shadow-modal)]"
                position="popper"
                sideOffset={4}
              >
                <Select.Viewport className="p-[var(--spacing-xs)]">
                  <Select.Item
                    value="all"
                    className="flex min-h-[36px] cursor-pointer items-center rounded-[var(--radius-sm)] px-[var(--spacing-sm)] py-[var(--spacing-xs)] font-sans text-[14px] text-brand-primary outline-none data-[highlighted]:bg-surface-sunken"
                  >
                    <Select.ItemText>All Domains</Select.ItemText>
                  </Select.Item>
                  {DOMAINS.map((d) => (
                    <Select.Item
                      key={d}
                      value={d}
                      className="flex min-h-[36px] cursor-pointer items-center rounded-[var(--radius-sm)] px-[var(--spacing-sm)] py-[var(--spacing-xs)] font-sans text-[14px] text-brand-primary outline-none data-[highlighted]:bg-surface-sunken"
                    >
                      <Select.ItemText>{d}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>

          {/* Create button */}
          <button
            type="button"
            onClick={handleCreate}
            className="hidden rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-white transition-[background-color] duration-[var(--transition-fast)] hover:bg-brand-accent/90 focus-visible:outline-2 focus-visible:outline-brand-accent focus-visible:outline-offset-2 md:inline-flex"
          >
            Create Micro-Task
          </button>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="mb-[var(--spacing-lg)] space-y-[var(--spacing-sm)] md:hidden">
        {sortedTasks.length === 0 ? (
          <EmptyState domain={domain} />
        ) : (
          sortedTasks
            .filter((t) => t.isActive)
            .map((task) => {
              const domainColor = DOMAIN_COLORS[task.domain];
              return (
                <div
                  key={task.id}
                  className="flex w-full items-center gap-[var(--spacing-sm)] rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-md)] text-left"
                >
                  {domainColor && (
                    <span
                      className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${domainColor.bg} ${domainColor.text}`}
                    >
                      {task.domain}
                    </span>
                  )}
                  <span className="flex-1 truncate font-sans text-[15px] font-medium text-brand-primary">
                    {task.title}
                  </span>
                </div>
              );
            })
        )}
        {sortedTasks.length > 0 ? (
          <p className="font-sans text-[12px] text-brand-secondary">
            Use a desktop viewport to create, edit, activate, or deactivate micro-tasks.
          </p>
        ) : null}
      </div>

      {/* Desktop data table */}
      <div className="hidden md:block">
        {sortedTasks.length === 0 ? (
          <EmptyState domain={domain} />
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised">
            {/* Table header */}
            <div className="grid grid-cols-[120px_1fr_100px_120px] gap-[var(--spacing-sm)] border-b border-surface-border px-[var(--spacing-md)] py-[var(--spacing-sm)]">
              <span className="font-sans text-[13px] font-medium text-brand-secondary">Domain</span>
              <span className="font-sans text-[13px] font-medium text-brand-secondary">Title</span>
              <span className="font-sans text-[13px] font-medium text-brand-secondary">Status</span>
              <span className="font-sans text-[13px] font-medium text-brand-secondary">
                Created
              </span>
            </div>

            {/* Table rows */}
            {sortedTasks.map((task) => {
              const domainColor = DOMAIN_COLORS[task.domain];

              return (
                <div
                  key={task.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleRowClick(task)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleRowClick(task);
                    }
                  }}
                  className={`grid w-full grid-cols-[120px_1fr_100px_120px] items-center gap-[var(--spacing-sm)] border-b border-surface-border px-[var(--spacing-md)] py-[var(--spacing-md)] text-left transition-colors duration-[var(--transition-fast)] last:border-b-0 hover:bg-surface-sunken/50 focus-visible:outline-2 focus-visible:outline-brand-accent focus-visible:outline-offset-[-2px] ${
                    task.isActive ? 'border-l-2 border-l-brand-accent' : ''
                  }`}
                  style={{ minHeight: '48px' }}
                  aria-label={`Edit ${task.title}`}
                >
                  {domainColor ? (
                    <span
                      className={`inline-flex w-fit items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${domainColor.bg} ${domainColor.text}`}
                    >
                      {task.domain}
                    </span>
                  ) : (
                    <span className="font-sans text-[14px] text-brand-secondary">
                      {task.domain}
                    </span>
                  )}
                  <span className="truncate font-sans text-[15px] font-medium text-brand-primary">
                    {task.title}
                  </span>
                  <MicroTaskStatusToggle
                    microTaskId={task.id}
                    isActive={task.isActive}
                    domain={task.domain}
                  />
                  <span className="font-sans text-[14px] text-brand-secondary">
                    {formatRelativeDate(task.createdAt)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Form panel */}
      <MicroTaskFormPanel open={formOpen} onOpenChange={setFormOpen} editTask={editTask} />
    </div>
  );
}

function EmptyState({ domain }: { domain: string | null }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-3xl)] text-center">
      <p className="font-sans text-[15px] text-brand-secondary">
        {domain
          ? `No micro-tasks configured for ${domain}. Create one to enable applications.`
          : 'No micro-tasks configured yet. Create one to enable applicant demonstrations.'}
      </p>
    </div>
  );
}

function MicroTaskListSkeleton() {
  return (
    <div role="status" aria-label="Loading micro-task configuration">
      <div className="mb-[var(--spacing-lg)] flex items-center justify-between">
        <div className="skeleton h-[32px] w-[280px]" />
        <div className="flex gap-[var(--spacing-sm)]">
          <div className="skeleton h-[40px] w-[160px]" />
          <div className="skeleton h-[40px] w-[160px]" />
        </div>
      </div>
      <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised">
        <div className="flex border-b border-surface-border px-[var(--spacing-md)] py-[var(--spacing-sm)]">
          <div className="skeleton h-[16px] w-[80px]" />
          <div className="skeleton ml-[var(--spacing-xl)] h-[16px] w-[200px]" />
          <div className="skeleton ml-auto h-[16px] w-[80px]" />
          <div className="skeleton ml-[var(--spacing-xl)] h-[16px] w-[100px]" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center border-b border-surface-border px-[var(--spacing-md)] py-[var(--spacing-md)] last:border-b-0"
            style={{ minHeight: '48px' }}
          >
            <div className="skeleton h-[24px] w-[80px] rounded-full" />
            <div className="skeleton ml-[var(--spacing-xl)] h-[20px] w-[250px]" />
            <div className="skeleton ml-auto h-[24px] w-[70px] rounded-full" />
            <div className="skeleton ml-[var(--spacing-xl)] h-[16px] w-[90px]" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading micro-task configuration</span>
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

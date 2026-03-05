'use client';

import { useState } from 'react';
import * as AlertDialog from '@radix-ui/react-dialog';
import type { MonitoredRepositoryType } from '@edin/shared';
import {
  useRepositories,
  useRemoveRepository,
  useRetryWebhook,
} from '../../../../hooks/use-repositories';
import { useToast } from '../../../ui/toast';
import { AddRepositoryForm } from './add-repository-form';

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

function StatusIndicator({ status }: { status: string }) {
  switch (status) {
    case 'ACTIVE':
      return (
        <span className="inline-flex items-center gap-[4px] font-sans text-[13px] text-[#3A7D7E]">
          <span className="inline-block h-[8px] w-[8px] rounded-full bg-[#3A7D7E]" />
          Active
        </span>
      );
    case 'PENDING':
      return (
        <span className="inline-flex items-center gap-[4px] font-sans text-[13px] text-[#B07545]">
          <span className="inline-block h-[8px] w-[8px] rounded-full bg-[#B07545]" />
          Pending
        </span>
      );
    case 'ERROR':
      return (
        <span className="inline-flex items-center gap-[4px] font-sans text-[13px] text-[#B07545]">
          <span className="inline-block h-[8px] w-[8px] rounded-full bg-[#B07545]" />
          <ErrorIcon />
          Error
        </span>
      );
    case 'REMOVING':
      return (
        <span className="inline-flex items-center gap-[4px] font-sans text-[13px] text-brand-secondary">
          <span className="inline-block h-[8px] w-[8px] rounded-full bg-brand-secondary" />
          Removing
        </span>
      );
    default:
      return <span className="font-sans text-[13px] text-brand-secondary">{status}</span>;
  }
}

export function RepositoryList() {
  const [formOpen, setFormOpen] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<MonitoredRepositoryType | null>(null);

  const { repositories, isLoading } = useRepositories();
  const removeRepository = useRemoveRepository();
  const retryWebhook = useRetryWebhook();
  const { toast } = useToast();

  const handleRemove = async () => {
    if (!removeTarget) return;

    try {
      await removeRepository.mutateAsync(removeTarget.id);
      toast({ title: 'Repository removed successfully', variant: 'success' });
      setRemoveTarget(null);
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : 'Failed to remove repository',
        variant: 'error',
      });
    }
  };

  const handleRetry = async (repo: MonitoredRepositoryType) => {
    try {
      await retryWebhook.mutateAsync(repo.id);
      toast({ title: 'Webhook registered successfully', variant: 'success' });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : 'Failed to register webhook',
        variant: 'error',
      });
    }
  };

  if (isLoading) {
    return <RepositoryListSkeleton />;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-[var(--spacing-lg)] flex flex-col gap-[var(--spacing-md)] sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-[28px] font-bold text-brand-primary">
          Repository Monitoring
        </h1>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-white transition-[background-color] duration-[var(--transition-fast)] hover:bg-brand-accent/90 focus-visible:outline-2 focus-visible:outline-brand-accent focus-visible:outline-offset-2"
        >
          Add Repository
        </button>
      </div>

      {/* Mobile cards */}
      <div className="mb-[var(--spacing-lg)] space-y-[var(--spacing-sm)] md:hidden">
        {repositories.length === 0 ? (
          <EmptyState />
        ) : (
          repositories.map((repo) => (
            <div
              key={repo.id}
              className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-md)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-sans text-[15px] font-medium text-brand-primary">
                  {repo.fullName}
                </span>
                <StatusIndicator status={repo.status} />
              </div>
              <span className="mt-[var(--spacing-xs)] block font-sans text-[13px] text-brand-secondary">
                Added {formatRelativeDate(repo.createdAt)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Desktop data table */}
      <div className="hidden md:block">
        {repositories.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_100px_120px_160px] gap-[var(--spacing-sm)] border-b border-surface-border px-[var(--spacing-md)] py-[var(--spacing-sm)]">
              <span className="font-sans text-[13px] font-medium text-brand-secondary">
                Repository
              </span>
              <span className="font-sans text-[13px] font-medium text-brand-secondary">Status</span>
              <span className="font-sans text-[13px] font-medium text-brand-secondary">Added</span>
              <span className="font-sans text-[13px] font-medium text-brand-secondary">
                Actions
              </span>
            </div>

            {/* Table rows */}
            {repositories.map((repo) => (
              <div key={repo.id}>
                <div
                  className="grid grid-cols-[1fr_100px_120px_160px] items-center gap-[var(--spacing-sm)] border-b border-surface-border px-[var(--spacing-md)] py-[var(--spacing-md)] last:border-b-0"
                  style={{ minHeight: '48px' }}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedRow(expandedRow === repo.id ? null : repo.id)}
                    className="truncate text-left font-sans text-[15px] font-medium text-brand-primary hover:text-brand-accent"
                  >
                    {repo.fullName}
                  </button>
                  <StatusIndicator status={repo.status} />
                  <span className="font-sans text-[14px] text-brand-secondary">
                    {formatRelativeDate(repo.createdAt)}
                  </span>
                  <div className="flex gap-[var(--spacing-xs)]">
                    {(repo.status === 'ERROR' || repo.status === 'PENDING') && (
                      <button
                        type="button"
                        onClick={() => handleRetry(repo)}
                        disabled={retryWebhook.isPending}
                        className="rounded-[var(--radius-sm)] border border-surface-border px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] text-brand-primary transition-colors hover:bg-surface-sunken disabled:opacity-50"
                      >
                        Retry
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setRemoveTarget(repo)}
                      className="rounded-[var(--radius-sm)] border border-surface-border px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] text-brand-secondary transition-colors hover:bg-surface-sunken"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Expanded error detail */}
                {expandedRow === repo.id && repo.statusMessage && (
                  <div className="border-b border-surface-border bg-surface-sunken/30 px-[var(--spacing-lg)] py-[var(--spacing-sm)]">
                    <p className="font-sans text-[13px] text-brand-secondary">
                      {repo.statusMessage}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add form panel */}
      <AddRepositoryForm open={formOpen} onOpenChange={setFormOpen} />

      {/* Remove confirmation dialog */}
      <AlertDialog.Root
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-lg)] bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-modal)]">
            <AlertDialog.Title className="font-serif text-[18px] font-bold text-brand-primary">
              Remove Repository
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-[var(--spacing-sm)] font-sans text-[14px] text-brand-secondary">
              This will stop monitoring{' '}
              <span className="font-medium text-brand-primary">{removeTarget?.fullName}</span>.
              Previously ingested contributions will remain.
            </AlertDialog.Description>
            <div className="mt-[var(--spacing-lg)] flex justify-end gap-[var(--spacing-sm)]">
              <AlertDialog.Close asChild>
                <button
                  type="button"
                  className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-brand-primary transition-colors hover:bg-surface-sunken"
                >
                  Cancel
                </button>
              </AlertDialog.Close>
              <button
                type="button"
                onClick={handleRemove}
                disabled={removeRepository.isPending}
                className="rounded-[var(--radius-md)] bg-[#B07545] px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-white transition-colors hover:bg-[#B07545]/90 disabled:opacity-50"
              >
                {removeRepository.isPending ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-3xl)] text-center">
      <p className="font-sans text-[15px] text-brand-secondary">
        No repositories monitored yet. Add a GitHub repository to start tracking contributions.
      </p>
    </div>
  );
}

function RepositoryListSkeleton() {
  return (
    <div role="status" aria-label="Loading repository monitoring">
      <div className="mb-[var(--spacing-lg)] flex items-center justify-between">
        <div className="skeleton h-[32px] w-[280px]" />
        <div className="skeleton h-[40px] w-[200px]" />
      </div>
      <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised">
        <div className="flex border-b border-surface-border px-[var(--spacing-md)] py-[var(--spacing-sm)]">
          <div className="skeleton h-[16px] w-[200px]" />
          <div className="skeleton ml-auto h-[16px] w-[80px]" />
          <div className="skeleton ml-[var(--spacing-xl)] h-[16px] w-[100px]" />
          <div className="skeleton ml-[var(--spacing-xl)] h-[16px] w-[100px]" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center border-b border-surface-border px-[var(--spacing-md)] py-[var(--spacing-md)] last:border-b-0"
            style={{ minHeight: '48px' }}
          >
            <div className="skeleton h-[20px] w-[220px]" />
            <div className="skeleton ml-auto h-[24px] w-[70px] rounded-full" />
            <div className="skeleton ml-[var(--spacing-xl)] h-[16px] w-[90px]" />
            <div className="skeleton ml-[var(--spacing-xl)] h-[32px] w-[80px]" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading repository monitoring</span>
    </div>
  );
}

function ErrorIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 3.5V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="6" cy="8.5" r="0.75" fill="currentColor" />
    </svg>
  );
}

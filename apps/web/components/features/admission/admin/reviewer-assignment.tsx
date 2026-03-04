'use client';

import { useState } from 'react';
import * as Select from '@radix-ui/react-select';
import { useAvailableReviewers, useAssignReviewer } from '../../../../hooks/use-admission-admin';
import { useToast } from '../../../ui/toast';

interface ReviewerAssignmentProps {
  applicationId: string;
  applicationDomain: string;
  existingReviewerIds: string[];
}

export function ReviewerAssignment({
  applicationId,
  applicationDomain,
  existingReviewerIds,
}: ReviewerAssignmentProps) {
  const [selectedReviewerId, setSelectedReviewerId] = useState('');
  const { reviewers, isLoading } = useAvailableReviewers(applicationDomain);
  const assignReviewer = useAssignReviewer();
  const { toast } = useToast();

  const availableReviewers = reviewers.filter((r) => !existingReviewerIds.includes(r.id));

  const handleAssign = async () => {
    if (!selectedReviewerId) return;

    try {
      await assignReviewer.mutateAsync({
        applicationId,
        contributorId: selectedReviewerId,
      });
      toast({ title: 'Reviewer assigned' });
      setSelectedReviewerId('');
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to assign reviewer',
        variant: 'error',
      });
    }
  };

  if (isLoading) {
    return <div className="skeleton h-[40px] w-full rounded-[var(--radius-md)]" />;
  }

  if (availableReviewers.length === 0) {
    return (
      <p className="font-sans text-[13px] text-brand-secondary">
        No additional reviewers available.
      </p>
    );
  }

  return (
    <div className="flex gap-[var(--spacing-sm)]">
      <Select.Root value={selectedReviewerId} onValueChange={setSelectedReviewerId}>
        <Select.Trigger
          className="flex min-h-[40px] flex-1 items-center justify-between rounded-[var(--radius-md)] border border-surface-border-input bg-surface-raised px-[var(--spacing-sm)] py-[var(--spacing-xs)] font-sans text-[14px] text-brand-primary outline-none transition-[border-color] duration-[var(--transition-fast)] focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
          aria-label="Select reviewer"
        >
          <Select.Value placeholder="Select a reviewer" />
          <Select.Icon className="ml-[var(--spacing-xs)] text-brand-secondary">
            <ChevronDownIcon />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            className="z-50 max-h-[240px] overflow-hidden rounded-[var(--radius-md)] border border-surface-border bg-surface-raised shadow-[var(--shadow-modal)]"
            position="popper"
            sideOffset={4}
          >
            <Select.Viewport className="p-[var(--spacing-xs)]">
              {availableReviewers.map((reviewer) => (
                <Select.Item
                  key={reviewer.id}
                  value={reviewer.id}
                  className="flex min-h-[36px] cursor-pointer items-center gap-[var(--spacing-sm)] rounded-[var(--radius-sm)] px-[var(--spacing-sm)] py-[var(--spacing-xs)] font-sans text-[14px] text-brand-primary outline-none data-[highlighted]:bg-surface-sunken"
                >
                  <Select.ItemText>
                    {reviewer.name}
                    {reviewer.domain ? ` (${reviewer.domain})` : ''}
                  </Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      <button
        type="button"
        onClick={handleAssign}
        disabled={!selectedReviewerId || assignReviewer.isPending}
        className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-md)] py-[var(--spacing-xs)] font-sans text-[14px] font-medium text-brand-primary transition-colors duration-[var(--transition-fast)] hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-brand-accent focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {assignReviewer.isPending ? 'Assigning...' : 'Assign'}
      </button>
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

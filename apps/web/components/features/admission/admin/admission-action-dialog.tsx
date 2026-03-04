'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useUpdateApplicationStatus } from '../../../../hooks/use-admission-admin';
import { useToast } from '../../../ui/toast';

interface AdmissionActionDialogProps {
  applicationId: string;
  applicantName: string;
  action: 'APPROVED' | 'DECLINED' | 'REQUEST_MORE_INFO';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AdmissionActionDialog({
  applicationId,
  applicantName,
  action,
  open,
  onOpenChange,
  onSuccess,
}: AdmissionActionDialogProps) {
  const [reason, setReason] = useState('');
  const updateStatus = useUpdateApplicationStatus();
  const { toast } = useToast();

  const isApprove = action === 'APPROVED';
  const isRequestInfo = action === 'REQUEST_MORE_INFO';
  const title = isApprove
    ? `Approve ${applicantName}'s application?`
    : isRequestInfo
      ? `Request more information from ${applicantName}?`
      : `Decline ${applicantName}'s application?`;
  const description = isApprove
    ? 'They will become a Contributor and their 72-Hour Ignition onboarding begins.'
    : isRequestInfo
      ? 'They will receive your request and can provide additional context.'
      : 'They will receive your reason for the decision.';

  const handleConfirm = async () => {
    if (!isApprove && !reason.trim()) return;

    try {
      await updateStatus.mutateAsync({
        applicationId,
        status: action,
        reason: reason.trim() || undefined,
      });
      toast({
        title: isApprove
          ? `${applicantName}'s application approved`
          : isRequestInfo
            ? `Requested more information from ${applicantName}`
            : `${applicantName}'s application declined`,
      });
      setReason('');
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to update application status',
        variant: 'error',
      });
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 w-[90vw] max-w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-xl)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-modal)] focus:outline-none"
          aria-describedby="action-dialog-description"
        >
          <Dialog.Title className="font-sans text-[18px] font-semibold text-brand-primary">
            {title}
          </Dialog.Title>
          <Dialog.Description
            id="action-dialog-description"
            className="mt-[var(--spacing-sm)] font-sans text-[14px] leading-[1.5] text-brand-secondary"
          >
            {description}
          </Dialog.Description>

          <div className="mt-[var(--spacing-md)]">
            <label
              htmlFor="action-reason"
              className="mb-[var(--spacing-xs)] block font-sans text-[13px] font-medium text-brand-secondary"
            >
              {isApprove ? 'Reason (optional)' : 'Reason (required)'}
            </label>
            <textarea
              id="action-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={
                isApprove
                  ? 'Optional note about the approval...'
                  : isRequestInfo
                    ? 'What additional details do you need?'
                    : 'Provide a reason for declining...'
              }
              className="w-full resize-none rounded-[var(--radius-md)] border border-surface-border-input bg-surface-raised px-[var(--spacing-sm)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary transition-[border-color] duration-[var(--transition-fast)] focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20 focus:outline-none"
              required={!isApprove}
            />
          </div>

          <div className="mt-[var(--spacing-lg)] flex justify-end gap-[var(--spacing-sm)]">
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-brand-primary transition-colors duration-[var(--transition-fast)] hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-brand-accent focus-visible:outline-offset-2"
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={updateStatus.isPending || (!isApprove && !reason.trim())}
              className={`rounded-[var(--radius-md)] px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium transition-[background-color,opacity] duration-[var(--transition-fast)] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                isApprove
                  ? 'bg-brand-accent text-white hover:bg-brand-accent/90 focus-visible:outline-brand-accent'
                  : isRequestInfo
                    ? 'border border-brand-accent text-brand-accent hover:bg-brand-accent/5 focus-visible:outline-brand-accent'
                    : 'border border-semantic-error text-semantic-error hover:bg-semantic-error/5 focus-visible:outline-semantic-error'
              }`}
            >
              {updateStatus.isPending
                ? 'Processing...'
                : isApprove
                  ? 'Approve'
                  : isRequestInfo
                    ? 'Request Info'
                    : 'Decline'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

'use client';

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useApplicationDetail } from '../../../../hooks/use-admission-admin';
import { DOMAIN_COLORS } from '../../../../lib/domain-colors';
import { ReviewFeedbackList } from './review-feedback-list';
import { ReviewerAssignment } from './reviewer-assignment';
import { AdmissionActionDialog } from './admission-action-dialog';

interface ApplicationDetailPanelProps {
  applicationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: 'bg-semantic-warning/10', text: 'text-semantic-warning', label: 'Pending' },
  UNDER_REVIEW: {
    bg: 'bg-semantic-info/10',
    text: 'text-semantic-info',
    label: 'Under Review',
  },
  APPROVED: { bg: 'bg-semantic-success/10', text: 'text-semantic-success', label: 'Approved' },
  DECLINED: { bg: 'bg-semantic-error/10', text: 'text-semantic-error', label: 'Declined' },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ApplicationDetailPanel({
  applicationId,
  open,
  onOpenChange,
}: ApplicationDetailPanelProps) {
  const { application, isLoading } = useApplicationDetail(applicationId);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    action: 'APPROVED' | 'DECLINED' | 'REQUEST_MORE_INFO';
  }>({ open: false, action: 'APPROVED' });

  const statusStyle = application
    ? (STATUS_STYLES[application.status] ?? {
        bg: 'bg-surface-sunken',
        text: 'text-brand-secondary',
        label: application.status,
      })
    : null;
  const domainColor = application?.domain ? DOMAIN_COLORS[application.domain] : null;

  const canTakeAction = application?.status === 'UNDER_REVIEW';

  const existingReviewerIds = application?.reviews.map((r) => r.reviewer.id) ?? [];

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/20 motion-safe:transition-opacity motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0 motion-safe:data-[state=open]:fade-in-0" />
          <Dialog.Content
            className="fixed top-0 right-0 z-40 flex h-full w-full max-w-[640px] flex-col border-l border-surface-border bg-surface-raised shadow-[var(--shadow-modal)] focus:outline-none motion-safe:transition-transform motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:slide-out-to-right motion-safe:data-[state=open]:slide-in-from-right"
            aria-describedby={undefined}
          >
            {isLoading || !application ? (
              <div
                className="flex-1 p-[var(--spacing-lg)]"
                role="status"
                aria-label="Loading application details"
              >
                <div className="skeleton mb-[var(--spacing-md)] h-[28px] w-[200px]" />
                <div className="skeleton mb-[var(--spacing-sm)] h-[20px] w-[300px]" />
                <div className="skeleton mb-[var(--spacing-sm)] h-[20px] w-[250px]" />
                <div className="skeleton mt-[var(--spacing-lg)] h-[100px] w-full" />
                <span className="sr-only">Loading application details</span>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-start justify-between border-b border-surface-border p-[var(--spacing-lg)]">
                  <div>
                    <Dialog.Title className="font-sans text-[20px] font-semibold text-brand-primary">
                      {application.applicantName}
                    </Dialog.Title>
                    <div className="mt-[var(--spacing-xs)] flex items-center gap-[var(--spacing-sm)]">
                      {domainColor && (
                        <span
                          className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${domainColor.bg} ${domainColor.text}`}
                        >
                          {application.domain}
                        </span>
                      )}
                      {statusStyle && (
                        <span
                          className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${statusStyle.bg} ${statusStyle.text}`}
                          role="status"
                        >
                          {statusStyle.label}
                        </span>
                      )}
                    </div>
                    <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-brand-secondary">
                      {application.applicantEmail}
                    </p>
                    <p className="font-sans text-[13px] text-brand-secondary">
                      Submitted {formatDate(application.createdAt)}
                    </p>
                  </div>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="rounded-[var(--radius-sm)] p-[var(--spacing-xs)] text-brand-secondary transition-colors hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-brand-accent"
                      aria-label="Close panel"
                    >
                      <CloseIcon />
                    </button>
                  </Dialog.Close>
                </div>

                {/* Content - scrollable */}
                <div className="flex-1 overflow-y-auto p-[var(--spacing-lg)]">
                  {/* Statement of Interest */}
                  <section className="mb-[var(--spacing-lg)]">
                    <h3 className="mb-[var(--spacing-sm)] font-sans text-[14px] font-semibold text-brand-primary">
                      Statement of Interest
                    </h3>
                    <p className="font-sans text-[14px] leading-[1.6] text-brand-primary">
                      {application.statementOfInterest}
                    </p>
                  </section>

                  {/* Micro-task Response */}
                  <section className="mb-[var(--spacing-lg)]">
                    <h3 className="mb-[var(--spacing-sm)] font-sans text-[14px] font-semibold text-brand-primary">
                      Micro-task Response ({application.microTaskDomain})
                    </h3>
                    <div className="max-h-[300px] overflow-y-auto rounded-[var(--radius-md)] border border-surface-border bg-surface-sunken p-[var(--spacing-md)]">
                      <p className="whitespace-pre-wrap font-sans text-[14px] leading-[1.6] text-brand-primary">
                        {application.microTaskResponse}
                      </p>
                    </div>
                    {application.microTaskSubmissionUrl && (
                      <a
                        href={application.microTaskSubmissionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-[var(--spacing-xs)] inline-block font-sans text-[13px] text-brand-accent underline hover:text-brand-accent/80"
                      >
                        View submission
                      </a>
                    )}
                  </section>

                  {/* Reviewers */}
                  <section className="mb-[var(--spacing-lg)]">
                    <h3 className="mb-[var(--spacing-sm)] font-sans text-[14px] font-semibold text-brand-primary">
                      Reviewers
                    </h3>
                    {(application.status === 'PENDING' ||
                      application.status === 'UNDER_REVIEW') && (
                      <div className="mb-[var(--spacing-md)]">
                        <ReviewerAssignment
                          applicationId={application.id}
                          applicationDomain={application.domain}
                          existingReviewerIds={existingReviewerIds}
                        />
                      </div>
                    )}
                    <ReviewFeedbackList reviews={application.reviews} />
                  </section>

                  {/* Decline reason (if declined) */}
                  {application.status === 'DECLINED' && application.declineReason && (
                    <section className="mb-[var(--spacing-lg)]">
                      <h3 className="mb-[var(--spacing-sm)] font-sans text-[14px] font-semibold text-semantic-error">
                        Decline Reason
                      </h3>
                      <p className="font-sans text-[14px] leading-[1.6] text-brand-primary">
                        {application.declineReason}
                      </p>
                    </section>
                  )}
                </div>

                {/* Action buttons (only for UNDER_REVIEW) */}
                {canTakeAction && (
                  <div className="flex gap-[var(--spacing-sm)] border-t border-surface-border p-[var(--spacing-lg)]">
                    <button
                      type="button"
                      onClick={() => setActionDialog({ open: true, action: 'APPROVED' })}
                      className="flex-1 rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-white transition-[background-color] duration-[var(--transition-fast)] hover:bg-brand-accent/90 focus-visible:outline-2 focus-visible:outline-brand-accent focus-visible:outline-offset-2"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionDialog({ open: true, action: 'REQUEST_MORE_INFO' })}
                      className="rounded-[var(--radius-md)] border border-brand-accent px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-brand-accent transition-colors duration-[var(--transition-fast)] hover:bg-brand-accent/5 focus-visible:outline-2 focus-visible:outline-brand-accent focus-visible:outline-offset-2"
                    >
                      Request Info
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionDialog({ open: true, action: 'DECLINED' })}
                      className="rounded-[var(--radius-md)] border border-semantic-error px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-semantic-error transition-colors duration-[var(--transition-fast)] hover:bg-semantic-error/5 focus-visible:outline-2 focus-visible:outline-semantic-error focus-visible:outline-offset-2"
                    >
                      Decline
                    </button>
                  </div>
                )}
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {application && (
        <AdmissionActionDialog
          applicationId={application.id}
          applicantName={application.applicantName}
          action={actionDialog.action}
          open={actionDialog.open}
          onOpenChange={(open) => setActionDialog((s) => ({ ...s, open }))}
          onSuccess={() => onOpenChange(false)}
        />
      )}
    </>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M6 6L14 14M14 6L6 14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

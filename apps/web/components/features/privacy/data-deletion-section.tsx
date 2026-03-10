'use client';

import { useState, useEffect } from 'react';
import {
  useDataDeletionRequest,
  useDataDeletionConfirm,
  useDataDeletionCancel,
} from '../../../hooks/use-gdpr';
import type { DataDeletionRequestDto } from '@edin/shared';

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800',
    CONFIRMED: 'bg-red-100 text-red-800',
    COMPLETED: 'bg-neutral-100 text-neutral-600',
    CANCELLED: 'bg-neutral-100 text-neutral-600',
  };
  const color = colorMap[status] ?? 'bg-neutral-100 text-neutral-600';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}

function computeCountdown(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) {
    return { expired: true, text: 'Cooling-off period has ended' };
  }
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { expired: false, text: `${hours}h ${minutes}m ${seconds}s remaining` };
}

function CoolingOffCountdown({ endsAt }: { endsAt: string }) {
  const [state, setState] = useState(() => computeCountdown(endsAt));

  useEffect(() => {
    const interval = setInterval(() => setState(computeCountdown(endsAt)), 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  return (
    <div className="mt-[var(--spacing-xs)]">
      <span
        className={`font-mono text-[13px] ${state.expired ? 'text-green-700' : 'text-amber-700'}`}
      >
        {state.text}
      </span>
    </div>
  );
}

export function DataDeletionSection() {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deletionRequest, setDeletionRequest] = useState<DataDeletionRequestDto | null>(null);

  const requestDeletion = useDataDeletionRequest();
  const confirmDeletion = useDataDeletionConfirm();
  const cancelDeletion = useDataDeletionCancel();

  const handleRequestDeletion = () => {
    setShowConfirmDialog(true);
  };

  const handleProceed = () => {
    setShowConfirmDialog(false);
    requestDeletion.mutate(undefined, {
      onSuccess: (data) => {
        setDeletionRequest(data);
      },
    });
  };

  const handleConfirmDeletion = () => {
    if (!deletionRequest) return;
    confirmDeletion.mutate(deletionRequest.id, {
      onSuccess: (data) => {
        setDeletionRequest(data);
      },
    });
  };

  const handleCancelDeletion = () => {
    if (!deletionRequest) return;
    cancelDeletion.mutate(deletionRequest.id, {
      onSuccess: (data) => {
        setDeletionRequest(data);
      },
    });
  };

  const [coolingOffExpired, setCoolingOffExpired] = useState(false);

  useEffect(() => {
    if (deletionRequest?.status !== 'PENDING' || !deletionRequest?.coolingOffEndsAt) {
      const t = setTimeout(() => setCoolingOffExpired(false), 0);
      return () => clearTimeout(t);
    }
    const check = () => {
      setCoolingOffExpired(new Date(deletionRequest.coolingOffEndsAt).getTime() <= Date.now());
    };
    const t = setTimeout(check, 0);
    const interval = setInterval(check, 1000);
    return () => {
      clearTimeout(t);
      clearInterval(interval);
    };
  }, [deletionRequest?.status, deletionRequest?.coolingOffEndsAt]);

  return (
    <section className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
      <h2 className="font-sans text-[16px] font-semibold text-brand-primary">
        Request Data Deletion
      </h2>
      <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-brand-secondary">
        Under GDPR Article 17, you have the right to request erasure of your personal data. A
        cooling-off period applies before deletion is finalized.
      </p>

      {(requestDeletion.error || confirmDeletion.error || cancelDeletion.error) && (
        <div className="mt-[var(--spacing-md)] rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-[var(--spacing-sm)] text-[13px] text-red-700">
          {requestDeletion.error?.message ??
            confirmDeletion.error?.message ??
            cancelDeletion.error?.message}
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="deletion-dialog-title"
          aria-describedby="deletion-dialog-desc"
          className="mt-[var(--spacing-md)] rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-[var(--spacing-lg)]"
        >
          <h3
            id="deletion-dialog-title"
            className="font-sans text-[14px] font-semibold text-red-800"
          >
            Are you sure you want to delete your data?
          </h3>
          <p
            id="deletion-dialog-desc"
            className="mt-[var(--spacing-sm)] font-sans text-[13px] text-red-700"
          >
            This action will have the following consequences:
          </p>
          <ul className="mt-[var(--spacing-sm)] list-disc pl-[var(--spacing-lg)] font-sans text-[13px] text-red-700">
            <li>All personally identifiable information (PII) will be permanently deleted</li>
            <li>
              Your contributions will be pseudonymized (attributed to &ldquo;Anonymous
              Contributor&rdquo;)
            </li>
            <li>Your account will be deactivated and cannot be recovered</li>
            <li>This action is irreversible after the cooling-off period</li>
          </ul>
          <div className="mt-[var(--spacing-md)] flex gap-[var(--spacing-sm)]">
            <button
              onClick={handleProceed}
              disabled={requestDeletion.isPending}
              className="inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] bg-red-600 px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {requestDeletion.isPending ? 'Submitting...' : 'I Understand, Proceed'}
            </button>
            <button
              onClick={() => setShowConfirmDialog(false)}
              className="inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-brand-primary transition-colors hover:bg-surface-base"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Active Deletion Request */}
      {deletionRequest && (
        <div className="mt-[var(--spacing-md)] rounded-[var(--radius-md)] border border-surface-border bg-surface-base p-[var(--spacing-md)]">
          <div className="flex items-center gap-[var(--spacing-sm)]">
            <span className="font-sans text-[13px] font-medium text-brand-primary">
              Deletion Request:
            </span>
            <StatusBadge status={deletionRequest.status} />
          </div>

          {deletionRequest.status === 'PENDING' && (
            <>
              <CoolingOffCountdown endsAt={deletionRequest.coolingOffEndsAt} />
              {coolingOffExpired ? (
                <div className="mt-[var(--spacing-md)] flex gap-[var(--spacing-sm)]">
                  <button
                    onClick={handleConfirmDeletion}
                    disabled={confirmDeletion.isPending}
                    className="inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] bg-red-600 px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {confirmDeletion.isPending ? 'Confirming...' : 'Confirm Deletion'}
                  </button>
                  <button
                    onClick={handleCancelDeletion}
                    disabled={cancelDeletion.isPending}
                    className="inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-brand-primary transition-colors hover:bg-surface-base disabled:opacity-50"
                  >
                    {cancelDeletion.isPending ? 'Cancelling...' : 'Cancel Request'}
                  </button>
                </div>
              ) : (
                <div className="mt-[var(--spacing-md)]">
                  <button
                    onClick={handleCancelDeletion}
                    disabled={cancelDeletion.isPending}
                    className="inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-brand-primary transition-colors hover:bg-surface-base disabled:opacity-50"
                  >
                    {cancelDeletion.isPending ? 'Cancelling...' : 'Cancel Request'}
                  </button>
                </div>
              )}
            </>
          )}

          {deletionRequest.status === 'CONFIRMED' && (
            <p className="mt-[var(--spacing-xs)] font-sans text-[12px] text-red-600">
              Deletion confirmed. Your data is being permanently removed.
            </p>
          )}

          {deletionRequest.status === 'COMPLETED' && (
            <p className="mt-[var(--spacing-xs)] font-sans text-[12px] text-brand-secondary">
              Data deletion has been completed.
              {deletionRequest.completedAt && (
                <> Completed on {new Date(deletionRequest.completedAt).toLocaleString()}.</>
              )}
            </p>
          )}

          {deletionRequest.status === 'CANCELLED' && (
            <p className="mt-[var(--spacing-xs)] font-sans text-[12px] text-brand-secondary">
              Deletion request was cancelled.
              {deletionRequest.cancelledAt && (
                <> Cancelled on {new Date(deletionRequest.cancelledAt).toLocaleString()}.</>
              )}
            </p>
          )}
        </div>
      )}

      {!showConfirmDialog && !deletionRequest && (
        <button
          onClick={handleRequestDeletion}
          className="mt-[var(--spacing-lg)] inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] border border-red-300 bg-red-50 px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-red-700 transition-colors hover:bg-red-100"
        >
          Request Data Deletion
        </button>
      )}
    </section>
  );
}

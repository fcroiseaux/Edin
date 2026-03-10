'use client';

import { useState } from 'react';
import { useDataExportRequest, useDataExportStatus } from '../../../hooks/use-gdpr';

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800',
    PROCESSING: 'bg-blue-100 text-blue-800',
    READY: 'bg-green-100 text-green-800',
    EXPIRED: 'bg-neutral-100 text-neutral-600',
    FAILED: 'bg-red-100 text-red-800',
  };
  const color = colorMap[status] ?? 'bg-neutral-100 text-neutral-600';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {status}
    </span>
  );
}

export function DataExportSection() {
  const [requestId, setRequestId] = useState<string | null>(null);
  const exportRequest = useDataExportRequest();
  const { data: exportStatus } = useDataExportStatus(requestId);

  const handleRequestExport = () => {
    exportRequest.mutate(undefined, {
      onSuccess: (data) => {
        setRequestId(data.id);
      },
    });
  };

  return (
    <section className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
      <h2 className="font-sans text-[16px] font-semibold text-brand-primary">Export My Data</h2>
      <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-brand-secondary">
        Request a full export of your personal data in machine-readable format. Under GDPR Article
        20, you have the right to receive your data and transfer it to another service.
      </p>

      {exportRequest.error && (
        <div className="mt-[var(--spacing-md)] rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-[var(--spacing-sm)] text-[13px] text-red-700">
          {exportRequest.error.message}
        </div>
      )}

      {exportStatus && (
        <div className="mt-[var(--spacing-md)] rounded-[var(--radius-md)] border border-surface-border bg-surface-base p-[var(--spacing-md)]">
          <div className="flex items-center gap-[var(--spacing-sm)]">
            <span className="font-sans text-[13px] font-medium text-brand-primary">
              Export Status:
            </span>
            <StatusBadge status={exportStatus.status} />
          </div>

          {(exportStatus.status === 'PENDING' || exportStatus.status === 'PROCESSING') && (
            <p className="mt-[var(--spacing-xs)] font-sans text-[12px] text-brand-secondary">
              Your data export is being prepared. This page will update automatically.
            </p>
          )}

          {exportStatus.status === 'READY' && exportStatus.downloadUrl && (
            <div className="mt-[var(--spacing-sm)]">
              <a
                href={exportStatus.downloadUrl}
                download={exportStatus.fileName ?? 'data-export.zip'}
                className="inline-flex items-center rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-md)] py-[var(--spacing-xs)] font-sans text-[13px] font-medium text-white transition-opacity hover:opacity-90"
              >
                Download Export
              </a>
              {exportStatus.expiresAt && (
                <p className="mt-[var(--spacing-xs)] font-sans text-[11px] text-brand-secondary">
                  Link expires: {new Date(exportStatus.expiresAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {exportStatus.status === 'EXPIRED' && (
            <p className="mt-[var(--spacing-xs)] font-sans text-[12px] text-brand-secondary">
              This export has expired. Please request a new export.
            </p>
          )}

          {exportStatus.status === 'FAILED' && (
            <p className="mt-[var(--spacing-xs)] font-sans text-[12px] text-red-600">
              Export failed. Please try again or contact support.
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleRequestExport}
        disabled={exportRequest.isPending}
        className="mt-[var(--spacing-lg)] inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {exportRequest.isPending ? 'Requesting...' : 'Request Data Export'}
      </button>
    </section>
  );
}

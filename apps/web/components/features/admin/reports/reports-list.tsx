'use client';

import type { GeneratedReport } from '@edin/shared';

interface ReportsListProps {
  reports: GeneratedReport[];
}

const STATUS_STYLES: Record<string, string> = {
  queued: 'bg-blue-100 text-blue-800',
  processing: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export function ReportsList({ reports }: ReportsListProps) {
  if (reports.length === 0) {
    return (
      <p className="py-[var(--spacing-2xl)] text-center font-serif text-[14px] text-brand-secondary">
        No reports generated yet.
      </p>
    );
  }

  return (
    <div className="space-y-[var(--spacing-sm)]">
      {reports.map((report) => (
        <div
          key={report.id}
          className="flex flex-col gap-[var(--spacing-sm)] rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-md)] sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex-1">
            <div className="flex items-center gap-[var(--spacing-sm)]">
              <span className="font-sans text-[14px] font-medium text-brand-primary">
                Report #{report.id.slice(0, 8)}
              </span>
              <span
                className={`inline-flex rounded-full px-[var(--spacing-sm)] py-[1px] font-sans text-[11px] font-medium ${STATUS_STYLES[report.status] ?? ''}`}
              >
                {report.status}
              </span>
              <span className="font-sans text-[11px] text-brand-secondary uppercase">
                {report.config.format}
              </span>
            </div>
            <p className="mt-[var(--spacing-xs)] font-sans text-[12px] text-brand-secondary">
              {report.config.startDate} — {report.config.endDate} | {report.config.kpiIds.length}{' '}
              KPIs
            </p>
            <p className="mt-[2px] font-sans text-[11px] text-brand-secondary opacity-60">
              Created: {new Date(report.createdAt).toLocaleString()}
              {report.completedAt &&
                ` | Completed: ${new Date(report.completedAt).toLocaleString()}`}
            </p>
          </div>
          {report.status === 'completed' && report.downloadUrl && (
            <a
              href={report.downloadUrl}
              className="inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-md)] font-sans text-[13px] font-medium text-brand-accent transition-colors hover:bg-surface-sunken"
              download
            >
              Download
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useAdmissionQueue } from '../../../../hooks/use-admission-admin';
import type { ApplicationListItem } from '../../../../hooks/use-admission-admin';
import { DOMAIN_COLORS } from '../../../../lib/domain-colors';
import { AdmissionFilters } from './admission-filters';
import { ApplicationDetailPanel } from './application-detail-panel';
import { AdmissionQueueSkeleton } from './admission-queue-skeleton';

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

export function AdmissionQueue() {
  const [domain, setDomain] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const { applications, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useAdmissionQueue({
      domain: domain ?? undefined,
      status: status ?? undefined,
    });

  const handleRowClick = (app: ApplicationListItem) => {
    setSelectedAppId(app.id);
    setPanelOpen(true);
  };

  if (isLoading) {
    return <AdmissionQueueSkeleton />;
  }

  return (
    <div>
      {/* Header with filters */}
      <div className="mb-[var(--spacing-lg)] flex flex-col gap-[var(--spacing-md)] sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-serif text-[28px] font-bold text-brand-primary">Admission Queue</h1>
        <AdmissionFilters
          activeDomain={domain}
          activeStatus={status}
          onDomainChange={setDomain}
          onStatusChange={setStatus}
        />
      </div>

      {/* Mobile summary cards */}
      <div className="mb-[var(--spacing-lg)] grid grid-cols-2 gap-[var(--spacing-sm)] md:hidden">
        <MobileStatusCard
          label="Pending"
          count={applications.filter((a) => a.status === 'PENDING').length}
          style={STATUS_STYLES.PENDING}
        />
        <MobileStatusCard
          label="Under Review"
          count={applications.filter((a) => a.status === 'UNDER_REVIEW').length}
          style={STATUS_STYLES.UNDER_REVIEW}
        />
      </div>

      {/* Desktop data table */}
      <div className="hidden md:block">
        {applications.length === 0 ? (
          <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-3xl)] text-center">
            <p className="font-sans text-[15px] text-brand-secondary">
              No applications pending review.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_120px_120px_140px_120px] gap-[var(--spacing-sm)] border-b border-surface-border px-[var(--spacing-md)] py-[var(--spacing-sm)]">
              <span className="font-sans text-[13px] font-medium text-brand-secondary">
                Applicant
              </span>
              <span className="font-sans text-[13px] font-medium text-brand-secondary">Domain</span>
              <span className="font-sans text-[13px] font-medium text-brand-secondary">
                Submitted
              </span>
              <span className="font-sans text-[13px] font-medium text-brand-secondary">
                Reviewers
              </span>
              <span className="font-sans text-[13px] font-medium text-brand-secondary">Status</span>
            </div>

            {/* Table rows */}
            {applications.map((app) => {
              const domainColor = DOMAIN_COLORS[app.domain];
              const statusStyle = STATUS_STYLES[app.status] ?? {
                bg: 'bg-surface-sunken',
                text: 'text-brand-secondary',
                label: app.status,
              };

              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => handleRowClick(app)}
                  className="grid w-full grid-cols-[1fr_120px_120px_140px_120px] items-center gap-[var(--spacing-sm)] border-b border-surface-border px-[var(--spacing-md)] py-[var(--spacing-md)] text-left transition-colors duration-[var(--transition-fast)] last:border-b-0 hover:bg-surface-sunken/50 focus-visible:outline-2 focus-visible:outline-brand-accent focus-visible:outline-offset-[-2px]"
                  style={{ minHeight: '48px' }}
                  aria-label={`View ${app.applicantName}'s application`}
                >
                  <span className="truncate font-sans text-[15px] font-medium text-brand-primary">
                    {app.applicantName}
                  </span>
                  {domainColor ? (
                    <span
                      className={`inline-flex w-fit items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${domainColor.bg} ${domainColor.text}`}
                    >
                      {app.domain}
                    </span>
                  ) : (
                    <span className="font-sans text-[14px] text-brand-secondary">{app.domain}</span>
                  )}
                  <span className="font-sans text-[14px] text-brand-secondary">
                    {formatRelativeDate(app.createdAt)}
                  </span>
                  <span className="font-sans text-[14px] text-brand-secondary">
                    {app.reviews.length > 0
                      ? app.reviews.map((r) => r.reviewer.name).join(', ')
                      : 'None'}
                  </span>
                  <span
                    className={`inline-flex w-fit items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${statusStyle.bg} ${statusStyle.text}`}
                  >
                    {statusStyle.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {hasNextPage && (
          <div className="mt-[var(--spacing-md)] flex justify-center">
            <button
              type="button"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-brand-primary transition-colors duration-[var(--transition-fast)] hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-brand-accent focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isFetchingNextPage ? 'Loading more...' : 'Load more'}
            </button>
          </div>
        )}
      </div>

      {/* Detail panel */}
      <ApplicationDetailPanel
        applicationId={selectedAppId}
        open={panelOpen}
        onOpenChange={setPanelOpen}
      />
    </div>
  );
}

function MobileStatusCard({
  label,
  count,
  style,
}: {
  label: string;
  count: number;
  style: { bg: string; text: string };
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-md)]">
      <p className="font-sans text-[13px] text-brand-secondary">{label}</p>
      <p className={`mt-[var(--spacing-xs)] font-sans text-[24px] font-semibold ${style.text}`}>
        {count}
      </p>
    </div>
  );
}

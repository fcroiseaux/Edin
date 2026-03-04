'use client';

import { DOMAIN_COLORS } from '../../../../lib/domain-colors';

interface ApplicationDetailViewProps {
  application: {
    applicantName: string;
    domain: string;
    statementOfInterest: string;
    microTaskDomain: string;
    microTaskResponse: string;
    microTaskSubmissionUrl: string | null;
    createdAt: string;
  };
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ApplicationDetailView({ application }: ApplicationDetailViewProps) {
  const domainColor = DOMAIN_COLORS[application.domain];

  return (
    <div className="space-y-[var(--spacing-lg)]">
      {/* Applicant info */}
      <div>
        <h2 className="font-sans text-[20px] font-semibold text-brand-primary">
          {application.applicantName}
        </h2>
        <div className="mt-[var(--spacing-xs)] flex items-center gap-[var(--spacing-sm)]">
          {domainColor && (
            <span
              className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${domainColor.bg} ${domainColor.text}`}
            >
              {application.domain}
            </span>
          )}
          <span className="font-sans text-[13px] text-brand-secondary">
            Submitted {formatDate(application.createdAt)}
          </span>
        </div>
      </div>

      {/* Statement of Interest */}
      <section>
        <h3 className="mb-[var(--spacing-sm)] font-sans text-[14px] font-semibold text-brand-primary">
          Statement of Interest
        </h3>
        <p className="font-sans text-[14px] leading-[1.6] text-brand-primary">
          {application.statementOfInterest}
        </p>
      </section>

      {/* Micro-task Response */}
      <section>
        <h3 className="mb-[var(--spacing-sm)] font-sans text-[14px] font-semibold text-brand-primary">
          Micro-task Response ({application.microTaskDomain})
        </h3>
        <div className="max-h-[400px] overflow-y-auto rounded-[var(--radius-md)] border border-surface-border bg-surface-sunken p-[var(--spacing-md)]">
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
    </div>
  );
}

'use client';

import { useComplianceDocument } from '../../../../hooks/use-compliance-documents';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  MODEL_CARD: 'Model Card',
  EVALUATION_CRITERIA: 'Evaluation Criteria',
  HUMAN_OVERSIGHT_REPORT: 'Human Oversight Report',
  DATA_PROCESSING_RECORD: 'Data Processing Record',
};

export function ComplianceDocumentViewer({
  docId,
  onClose,
}: {
  docId: string;
  onClose: () => void;
}) {
  const { data: document, isLoading, error } = useComplianceDocument(docId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="viewer-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="mx-[var(--spacing-lg)] max-h-[80vh] w-full max-w-[800px] overflow-y-auto rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-xl)] shadow-lg">
        <div className="flex items-start justify-between">
          <h2 id="viewer-title" className="font-serif text-[18px] font-bold text-brand-primary">
            {document
              ? `${DOCUMENT_TYPE_LABELS[document.documentType] ?? document.documentType} v${document.version}`
              : 'Document'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close document viewer"
            className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-sm)] py-1 text-xs text-brand-secondary transition-colors hover:text-brand-primary"
          >
            Close
          </button>
        </div>

        {isLoading && (
          <div className="mt-[var(--spacing-lg)] text-center text-brand-secondary">
            Loading document...
          </div>
        )}

        {error && (
          <div className="mt-[var(--spacing-lg)] rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-[var(--spacing-sm)] text-[13px] text-red-700">
            Failed to load document. {error.message}
          </div>
        )}

        {document && (
          <>
            <div className="mt-[var(--spacing-md)] flex flex-wrap gap-[var(--spacing-sm)] text-xs text-brand-secondary">
              <span>Generated: {new Date(document.generatedAt).toLocaleString()}</span>
              {document.legalReviewedAt ? (
                <span className="rounded-full bg-green-100 px-2 py-0.5 font-medium text-green-800">
                  Reviewed
                </span>
              ) : (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
                  Legal Review Pending
                </span>
              )}
            </div>

            {document.reviewNotes && (
              <div className="mt-[var(--spacing-md)] rounded-[var(--radius-md)] border border-surface-border bg-surface-base p-[var(--spacing-sm)]">
                <span className="block text-xs font-medium text-brand-secondary">Review Notes</span>
                <p className="mt-1 font-sans text-[13px] text-brand-primary">
                  {document.reviewNotes}
                </p>
              </div>
            )}

            <div className="mt-[var(--spacing-lg)]">
              <span className="block text-xs font-medium text-brand-secondary">
                Document Content
              </span>
              <pre className="mt-[var(--spacing-xs)] max-h-[400px] overflow-auto rounded-[var(--radius-md)] border border-surface-border bg-surface-base p-[var(--spacing-md)] font-mono text-[12px] text-brand-primary">
                {typeof document.content === 'string'
                  ? document.content
                  : JSON.stringify(document.content, null, 2)}
              </pre>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

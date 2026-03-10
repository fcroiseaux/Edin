'use client';

import { useState } from 'react';
import {
  useComplianceDocuments,
  useReviewComplianceDocument,
} from '../../../../hooks/use-compliance-documents';
import { ComplianceDocumentViewer } from './compliance-document-viewer';
import type { ComplianceDocumentDto } from '@edin/shared';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  MODEL_CARD: 'Model Card',
  EVALUATION_CRITERIA: 'Evaluation Criteria',
  HUMAN_OVERSIGHT_REPORT: 'Human Oversight Report',
  DATA_PROCESSING_RECORD: 'Data Processing Record',
};

const DOCUMENT_TYPE_COLORS: Record<string, string> = {
  MODEL_CARD: 'bg-blue-100 text-blue-800',
  EVALUATION_CRITERIA: 'bg-purple-100 text-purple-800',
  HUMAN_OVERSIGHT_REPORT: 'bg-amber-100 text-amber-800',
  DATA_PROCESSING_RECORD: 'bg-green-100 text-green-800',
};

function DocumentTypeBadge({ type }: { type: string }) {
  const color = DOCUMENT_TYPE_COLORS[type] ?? 'bg-neutral-100 text-neutral-600';
  const label = DOCUMENT_TYPE_LABELS[type] ?? type;
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {label}
    </span>
  );
}

function ReviewStatusBadge({ doc }: { doc: ComplianceDocumentDto }) {
  if (doc.legalReviewedAt) {
    return (
      <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
        Reviewed
      </span>
    );
  }
  return (
    <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
      Pending Review
    </span>
  );
}

function ReviewDialog({ doc, onClose }: { doc: ComplianceDocumentDto; onClose: () => void }) {
  const [reviewNotes, setReviewNotes] = useState('');
  const reviewMutation = useReviewComplianceDocument();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewNotes.trim()) return;
    reviewMutation.mutate(
      { docId: doc.id, reviewNotes },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };

  return (
    <div className="mt-[var(--spacing-md)] rounded-[var(--radius-md)] border border-surface-border bg-surface-base p-[var(--spacing-lg)]">
      <h3 className="font-sans text-[14px] font-semibold text-brand-primary">
        Review: {DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType} v{doc.version}
      </h3>
      <form onSubmit={handleSubmit} className="mt-[var(--spacing-md)]">
        <label
          htmlFor="review-notes"
          className="block font-sans text-[13px] font-medium text-brand-primary"
        >
          Review Notes
        </label>
        <textarea
          id="review-notes"
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          rows={4}
          required
          className="mt-[var(--spacing-xs)] w-full rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary placeholder:text-brand-secondary"
          placeholder="Enter your legal review notes..."
        />
        {reviewMutation.error && (
          <p className="mt-[var(--spacing-xs)] font-sans text-[12px] text-red-600">
            {reviewMutation.error.message}
          </p>
        )}
        <div className="mt-[var(--spacing-md)] flex gap-[var(--spacing-sm)]">
          <button
            type="submit"
            disabled={reviewMutation.isPending || !reviewNotes.trim()}
            className="inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {reviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-brand-primary transition-colors hover:bg-surface-base"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export function ComplianceDocumentTable() {
  const [cursor, setCursor] = useState<string | undefined>();
  const [reviewingDoc, setReviewingDoc] = useState<ComplianceDocumentDto | null>(null);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);

  const { documents, pagination, isLoading, isFetching, error } = useComplianceDocuments(cursor);

  if (isLoading) {
    return (
      <div className="py-[var(--spacing-xl)] text-center text-brand-secondary">
        Loading compliance documents...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-[var(--spacing-md)] text-[13px] text-red-700">
        Failed to load compliance documents. {error.message}
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="py-[var(--spacing-xl)] text-center text-brand-secondary">
        No compliance documents generated yet.
      </div>
    );
  }

  return (
    <div className="space-y-[var(--spacing-lg)]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm" role="table">
          <thead>
            <tr className="border-b border-surface-border text-xs font-medium text-brand-secondary">
              <th className="px-[var(--spacing-sm)] py-[var(--spacing-xs)]">Document Type</th>
              <th className="px-[var(--spacing-sm)] py-[var(--spacing-xs)]">Version</th>
              <th className="px-[var(--spacing-sm)] py-[var(--spacing-xs)]">Generated</th>
              <th className="px-[var(--spacing-sm)] py-[var(--spacing-xs)]">Review Status</th>
              <th className="px-[var(--spacing-sm)] py-[var(--spacing-xs)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} className="border-b border-surface-border last:border-b-0">
                <td className="px-[var(--spacing-sm)] py-[var(--spacing-sm)]">
                  <DocumentTypeBadge type={doc.documentType} />
                </td>
                <td className="px-[var(--spacing-sm)] py-[var(--spacing-sm)] font-mono text-[13px] text-brand-primary">
                  v{doc.version}
                </td>
                <td className="whitespace-nowrap px-[var(--spacing-sm)] py-[var(--spacing-sm)] text-xs text-brand-secondary">
                  {new Date(doc.generatedAt).toLocaleString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="px-[var(--spacing-sm)] py-[var(--spacing-sm)]">
                  <ReviewStatusBadge doc={doc} />
                  {doc.legalReviewedBy && (
                    <span
                      className="ml-1 text-[11px] text-brand-secondary"
                      title={doc.legalReviewedBy}
                    >
                      by {doc.legalReviewedBy.slice(0, 8)}&hellip;
                    </span>
                  )}
                </td>
                <td className="px-[var(--spacing-sm)] py-[var(--spacing-sm)]">
                  <div className="flex gap-[var(--spacing-xs)]">
                    <button
                      onClick={() => setViewingDocId(doc.id)}
                      className="rounded-[var(--radius-sm)] border border-surface-border px-[var(--spacing-sm)] py-1 text-xs text-brand-accent transition-colors hover:bg-brand-accent/10"
                    >
                      View
                    </button>
                    {!doc.legalReviewedAt && (
                      <button
                        onClick={() => setReviewingDoc(doc)}
                        className="rounded-[var(--radius-sm)] border border-surface-border px-[var(--spacing-sm)] py-1 text-xs text-brand-accent transition-colors hover:bg-brand-accent/10"
                      >
                        Review
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {reviewingDoc && <ReviewDialog doc={reviewingDoc} onClose={() => setReviewingDoc(null)} />}

      {viewingDocId && (
        <ComplianceDocumentViewer docId={viewingDocId} onClose={() => setViewingDocId(null)} />
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={() => setCursor(undefined)}
          disabled={!cursor}
          className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-md)] py-[var(--spacing-xs)] text-sm text-brand-secondary transition-colors hover:text-brand-primary disabled:opacity-50"
        >
          First Page
        </button>
        {isFetching && <span className="text-xs text-brand-secondary">Loading...</span>}
        <button
          onClick={() => {
            if (pagination?.nextCursor) setCursor(pagination.nextCursor);
          }}
          disabled={!pagination?.hasMore}
          className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-md)] py-[var(--spacing-xs)] text-sm text-brand-secondary transition-colors hover:text-brand-primary disabled:opacity-50"
        >
          Next Page
        </button>
      </div>
    </div>
  );
}

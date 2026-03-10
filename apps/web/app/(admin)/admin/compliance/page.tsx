import { ComplianceDocumentGenerator } from '../../../../components/features/admin/compliance/compliance-document-generator';
import { ComplianceDocumentTable } from '../../../../components/features/admin/compliance/compliance-document-table';

export default function AdminCompliancePage() {
  return (
    <main className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <div className="mb-[var(--spacing-lg)]">
        <h1 className="font-serif text-[28px] font-bold text-brand-primary">
          EU AI Act Compliance
        </h1>
        <p className="mt-[var(--spacing-xs)] text-sm text-brand-secondary">
          Generate, review, and manage compliance documentation required under the EU AI Act.
        </p>
      </div>

      <div className="mb-[var(--spacing-xl)]">
        <ComplianceDocumentGenerator />
      </div>

      <div className="rounded-lg border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
        <h2 className="mb-[var(--spacing-md)] font-serif text-[18px] font-bold text-brand-primary">
          Generated Documents
        </h2>
        <ComplianceDocumentTable />
      </div>
    </main>
  );
}

import { DataExportSection } from '../../../../../components/features/privacy/data-export-section';
import { DataDeletionSection } from '../../../../../components/features/privacy/data-deletion-section';

export default function PrivacySettingsPage() {
  return (
    <div className="p-[var(--spacing-xl)]">
      <h1 className="mb-[var(--spacing-xs)] font-serif text-[24px] font-bold text-brand-primary">
        Privacy &amp; Data Rights
      </h1>
      <p className="mb-[var(--spacing-xl)] font-sans text-[14px] text-brand-secondary">
        Manage your personal data. Under GDPR, you have the right to export or delete your data at
        any time.
      </p>

      <div className="space-y-[var(--spacing-lg)]">
        <DataExportSection />
        <DataDeletionSection />
      </div>
    </div>
  );
}

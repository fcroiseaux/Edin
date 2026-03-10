import { AuditLogTable } from '../../../../components/features/admin/audit-logs/audit-log-table';

export default function AuditLogsPage() {
  return (
    <main className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <div className="mb-[var(--spacing-lg)]">
        <h1 className="font-serif text-[28px] font-bold text-brand-primary">Audit Logs</h1>
        <p className="mt-[var(--spacing-xs)] text-sm text-brand-secondary">
          Immutable record of all security-relevant actions. Entries are append-only and retained
          for 2 years.
        </p>
      </div>
      <div className="rounded-lg border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
        <AuditLogTable />
      </div>
    </main>
  );
}

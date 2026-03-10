'use client';

import { useReports, useCreateReport } from '../../../../hooks/use-reports';
import { ReportConfigForm } from '../../../../components/features/admin/reports/report-config-form';
import { ReportsList } from '../../../../components/features/admin/reports/reports-list';

export default function AdminReportsPage() {
  const { reports, isLoading } = useReports();
  const createMutation = useCreateReport();

  return (
    <main className="min-h-screen bg-surface-base">
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-2xl)]">
        <h1 className="font-serif text-[28px] font-bold text-brand-primary">Metrics Reports</h1>
        <p className="mt-[var(--spacing-xs)] font-serif text-[14px] text-brand-secondary">
          Generate and download KPI reports for quarterly reviews.
        </p>

        <div className="mt-[var(--spacing-2xl)]">
          <ReportConfigForm
            onSubmit={(config) => createMutation.mutate(config)}
            isPending={createMutation.isPending}
          />
        </div>

        <div className="mt-[var(--spacing-2xl)]">
          <h2 className="font-serif text-[18px] font-bold text-brand-primary">Generated Reports</h2>
          <div className="mt-[var(--spacing-md)]">
            {isLoading ? (
              <div className="space-y-[var(--spacing-sm)]">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-md)]"
                  >
                    <div className="flex items-center gap-[var(--spacing-sm)]">
                      <div className="skeleton h-[16px] w-[140px]" />
                      <div className="skeleton h-[18px] w-[70px] rounded-full" />
                    </div>
                    <div className="mt-[var(--spacing-xs)] skeleton h-[14px] w-[250px]" />
                  </div>
                ))}
              </div>
            ) : (
              <ReportsList reports={reports} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

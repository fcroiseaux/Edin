'use client';

import { useZenhubConfig, useUpdateZenhubConfig } from '../../../../../hooks/use-zenhub-config';
import { ZenhubConfigForm } from '../../../../../components/features/sprint-dashboard/zenhub-config-form';

export default function ZenhubConfigurationPage() {
  const { config, isLoading, error } = useZenhubConfig();
  const updateConfig = useUpdateZenhubConfig();

  const handleSave = (updates: Record<string, unknown>) => {
    updateConfig.mutate(updates as Parameters<typeof updateConfig.mutate>[0]);
  };

  return (
    <div className="p-[var(--spacing-xl)]">
      <h1 className="mb-[var(--spacing-xl)] font-serif text-[24px] font-bold text-brand-primary">
        Zenhub Integration Configuration
      </h1>

      {error && (
        <div className="mb-[var(--spacing-md)] rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-[var(--spacing-md)] text-[14px] text-red-700">
          Failed to load configuration: {error.message}
        </div>
      )}

      {updateConfig.isSuccess && (
        <div className="mb-[var(--spacing-md)] rounded-[var(--radius-md)] border border-green-300 bg-green-50 p-[var(--spacing-md)] text-[14px] text-green-700">
          Configuration updated successfully.
        </div>
      )}

      {updateConfig.error && (
        <div className="mb-[var(--spacing-md)] rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-[var(--spacing-md)] text-[14px] text-red-700">
          Failed to update configuration: {updateConfig.error.message}
        </div>
      )}

      {isLoading ? (
        <div className="h-[400px] animate-pulse rounded-[var(--radius-lg)] bg-surface-border" />
      ) : config ? (
        <section className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
          <div className="mb-[var(--spacing-md)]">
            <h2 className="font-sans text-[16px] font-semibold text-brand-primary">
              Connection Settings
            </h2>
            <p className="mt-[var(--spacing-xs)] text-[13px] text-brand-secondary">
              Configure the Zenhub API credentials, webhook settings, and polling schedule.
            </p>
          </div>
          <ZenhubConfigForm
            config={config}
            onSave={handleSave}
            isPending={updateConfig.isPending}
          />
        </section>
      ) : null}
    </div>
  );
}

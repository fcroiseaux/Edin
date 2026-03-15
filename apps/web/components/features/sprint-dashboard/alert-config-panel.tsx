'use client';

import { useState } from 'react';
import { useZenhubAlertConfig, useUpdateZenhubAlertConfig } from '../../../hooks/use-zenhub-alerts';
import type { ZenhubAlertConfig } from '@edin/shared';

function AlertConfigForm({ config }: { config: ZenhubAlertConfig }) {
  const mutation = useUpdateZenhubAlertConfig();

  const [threshold, setThreshold] = useState(config.webhookFailureThreshold);
  const [timeout, setTimeout] = useState(config.pollingTimeoutMinutes);
  const [enabled, setEnabled] = useState(config.enabled);

  function handleSave() {
    mutation.mutate({
      webhookFailureThreshold: threshold,
      pollingTimeoutMinutes: timeout,
      enabled,
    });
  }

  const inputClass =
    'w-24 rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-sm)] py-[var(--spacing-xs)] text-sm text-brand-primary';

  return (
    <div className="space-y-[var(--spacing-md)]">
      <div className="flex items-center gap-[var(--spacing-md)]">
        <label className="flex items-center gap-[var(--spacing-xs)]">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-surface-border"
          />
          <span className="text-sm font-medium text-brand-primary">Alerts enabled</span>
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-[var(--spacing-lg)]">
        <div>
          <label className="block text-xs font-medium text-brand-secondary">
            Webhook failure threshold (%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            step={0.1}
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
            className={inputClass}
            aria-label="Webhook failure threshold percentage"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-brand-secondary">
            Polling timeout (minutes)
          </label>
          <input
            type="number"
            min={1}
            max={1440}
            value={timeout}
            onChange={(e) => setTimeout(Number(e.target.value))}
            className={inputClass}
            aria-label="Polling timeout in minutes"
          />
        </div>

        <button
          onClick={handleSave}
          disabled={mutation.isPending}
          className="rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[var(--spacing-xs)] text-sm font-medium text-white transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>

      {mutation.isSuccess && <p className="text-xs text-green-600">Alert configuration saved.</p>}
      {mutation.isError && (
        <p className="text-xs text-red-600">Failed to save: {mutation.error.message}</p>
      )}
    </div>
  );
}

export function AlertConfigPanel() {
  const { config, isLoading } = useZenhubAlertConfig();

  if (isLoading || !config) {
    return (
      <div className="py-[var(--spacing-md)] text-center text-brand-secondary">
        Loading alert configuration...
      </div>
    );
  }

  return <AlertConfigForm config={config} />;
}

'use client';

import { useState } from 'react';
import type { ZenhubConfigResponse } from '@edin/shared';

interface ZenhubConfigFormProps {
  config: ZenhubConfigResponse;
  onSave: (updates: Record<string, unknown>) => void;
  isPending: boolean;
}

export function ZenhubConfigForm({ config, onSave, isPending }: ZenhubConfigFormProps) {
  const [apiToken, setApiToken] = useState('');
  const [webhookUrl, setWebhookUrl] = useState(config.webhookUrl ?? '');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [pollingIntervalMs, setPollingIntervalMs] = useState(
    String(config.pollingIntervalMs / 60_000),
  );
  const [workspaceMappingRaw, setWorkspaceMappingRaw] = useState(
    config.workspaceMapping ? JSON.stringify(config.workspaceMapping, null, 2) : '',
  );
  const [workspaceMappingError, setWorkspaceMappingError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updates: Record<string, unknown> = {};

    if (apiToken.trim()) {
      updates.apiToken = apiToken.trim();
    }
    if (webhookUrl.trim() !== (config.webhookUrl ?? '')) {
      updates.webhookUrl = webhookUrl.trim();
    }
    if (webhookSecret.trim()) {
      updates.webhookSecret = webhookSecret.trim();
    }

    const intervalMinutes = Number(pollingIntervalMs);
    if (!Number.isNaN(intervalMinutes) && intervalMinutes >= 1) {
      const intervalMs = intervalMinutes * 60_000;
      if (intervalMs !== config.pollingIntervalMs) {
        updates.pollingIntervalMs = intervalMs;
      }
    }

    if (workspaceMappingRaw.trim()) {
      try {
        const parsed = JSON.parse(workspaceMappingRaw);
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          setWorkspaceMappingError(null);
          if (JSON.stringify(parsed) !== JSON.stringify(config.workspaceMapping)) {
            updates.workspaceMapping = parsed;
          }
        } else {
          setWorkspaceMappingError('Must be a JSON object (e.g. {"workspace_id": "group_name"})');
          return;
        }
      } catch {
        setWorkspaceMappingError('Invalid JSON');
        return;
      }
    }

    if (Object.keys(updates).length > 0) {
      onSave(updates);
      setApiToken('');
      setWebhookSecret('');
    }
  };

  const inputClasses =
    'w-full rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none';
  const labelClasses =
    'block font-sans text-[13px] font-medium text-text-secondary mb-[var(--spacing-xs)]';

  return (
    <form onSubmit={handleSubmit} className="space-y-[var(--spacing-lg)]">
      {/* API Token */}
      <div>
        <label htmlFor="zenhub-api-token" className={labelClasses}>
          API Token
        </label>
        <input
          id="zenhub-api-token"
          type="password"
          value={apiToken}
          onChange={(e) => setApiToken(e.target.value)}
          placeholder={
            config.apiTokenConfigured
              ? `Configured (${config.apiTokenHint})`
              : 'Enter Zenhub API token'
          }
          className={inputClasses}
          autoComplete="off"
        />
        {config.apiTokenConfigured && (
          <p className="mt-[var(--spacing-xs)] text-[12px] text-text-tertiary">
            Token is configured. Enter a new value to replace it.
          </p>
        )}
      </div>

      {/* Webhook URL */}
      <div>
        <label htmlFor="zenhub-webhook-url" className={labelClasses}>
          Webhook URL
        </label>
        <input
          id="zenhub-webhook-url"
          type="url"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://your-domain.com/api/v1/webhooks/zenhub"
          className={inputClasses}
        />
      </div>

      {/* Webhook Secret */}
      <div>
        <label htmlFor="zenhub-webhook-secret" className={labelClasses}>
          Webhook Secret
        </label>
        <input
          id="zenhub-webhook-secret"
          type="password"
          value={webhookSecret}
          onChange={(e) => setWebhookSecret(e.target.value)}
          placeholder={
            config.webhookSecretConfigured
              ? 'Configured — enter new value to replace'
              : 'Enter webhook secret (min 16 characters)'
          }
          className={inputClasses}
          autoComplete="off"
        />
      </div>

      {/* Polling Interval */}
      <div>
        <label htmlFor="zenhub-polling-interval" className={labelClasses}>
          Polling Interval (minutes)
        </label>
        <input
          id="zenhub-polling-interval"
          type="number"
          min={1}
          max={1440}
          value={pollingIntervalMs}
          onChange={(e) => setPollingIntervalMs(e.target.value)}
          className={inputClasses}
        />
        <p className="mt-[var(--spacing-xs)] text-[12px] text-text-tertiary">
          How often to poll the Zenhub API for sprint data (1-1440 minutes).
        </p>
      </div>

      {/* Workspace Mapping */}
      <div>
        <label htmlFor="zenhub-workspace-mapping" className={labelClasses}>
          Workspace Mapping (JSON)
        </label>
        <textarea
          id="zenhub-workspace-mapping"
          value={workspaceMappingRaw}
          onChange={(e) => {
            setWorkspaceMappingRaw(e.target.value);
            setWorkspaceMappingError(null);
          }}
          placeholder='{"zenhub_workspace_id": "edin_working_group_name"}'
          rows={4}
          className={inputClasses}
        />
        {workspaceMappingError && (
          <p className="mt-[var(--spacing-xs)] text-[12px] text-red-600">{workspaceMappingError}</p>
        )}
        <p className="mt-[var(--spacing-xs)] text-[12px] text-text-tertiary">
          Map Zenhub workspace IDs to Edin working groups.
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-[var(--radius-md)] bg-accent-primary px-[var(--spacing-xl)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50"
      >
        {isPending ? 'Saving...' : 'Save Configuration'}
      </button>
    </form>
  );
}

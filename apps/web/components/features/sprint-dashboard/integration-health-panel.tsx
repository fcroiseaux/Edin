'use client';

import { useIntegrationHealth } from '../../../hooks/use-zenhub-sync-logs';

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.round(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.round(diffHrs / 24);
  return `${diffDays}d ago`;
}

function StatusIndicator({ status }: { status: 'healthy' | 'degraded' | 'down' }) {
  const colors = {
    healthy: 'bg-green-500',
    degraded: 'bg-amber-500',
    down: 'bg-red-500',
  };
  const labels = {
    healthy: 'Healthy',
    degraded: 'Degraded',
    down: 'Down',
  };
  return (
    <div className="flex items-center gap-[var(--spacing-xs)]">
      <span className={`inline-block h-3 w-3 rounded-full ${colors[status]}`} aria-hidden="true" />
      <span className="text-sm font-medium text-brand-primary">{labels[status]}</span>
    </div>
  );
}

function MetricCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface-raised p-[var(--spacing-md)]">
      <p className="text-xs font-medium text-brand-secondary">{label}</p>
      <div className="mt-[var(--spacing-xs)]">{children}</div>
    </div>
  );
}

export function IntegrationHealthPanel() {
  const { health, isLoading } = useIntegrationHealth();

  if (isLoading) {
    return (
      <div className="py-[var(--spacing-lg)] text-center text-brand-secondary">
        Loading integration health...
      </div>
    );
  }

  if (!health) {
    return (
      <div className="py-[var(--spacing-lg)] text-center text-brand-secondary">
        Unable to load integration health data.
      </div>
    );
  }

  return (
    <section aria-label="Integration health">
      <div className="grid grid-cols-2 gap-[var(--spacing-md)] sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Overall Status">
          <StatusIndicator status={health.overallStatus} />
        </MetricCard>

        <MetricCard label="Last Successful Poll">
          <p className="text-sm font-medium text-brand-primary">
            {health.lastSuccessfulPoll ? formatRelativeTime(health.lastSuccessfulPoll) : 'Never'}
          </p>
        </MetricCard>

        <MetricCard label="Last Successful Webhook">
          <p className="text-sm font-medium text-brand-primary">
            {health.lastSuccessfulWebhook
              ? formatRelativeTime(health.lastSuccessfulWebhook)
              : 'Never'}
          </p>
        </MetricCard>

        <MetricCard label="Webhook Success Rate (24h)">
          <p className="text-sm font-medium text-brand-primary">{health.webhookSuccessRate}%</p>
        </MetricCard>

        <MetricCard label="Webhooks (24h)">
          <p className="text-sm font-medium text-brand-primary">
            {health.webhookTotalLast24h} total
            {health.webhookFailedLast24h > 0 && (
              <span className="ml-1 text-red-600">({health.webhookFailedLast24h} failed)</span>
            )}
          </p>
        </MetricCard>

        <MetricCard label="Avg Polling Duration">
          <p className="text-sm font-medium text-brand-primary">
            {health.pollingAvgDurationMs != null
              ? `${(health.pollingAvgDurationMs / 1000).toFixed(1)}s`
              : 'N/A'}
          </p>
        </MetricCard>
      </div>
    </section>
  );
}

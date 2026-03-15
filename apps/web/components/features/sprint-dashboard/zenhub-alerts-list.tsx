'use client';

import { useZenhubAlerts, useDismissZenhubAlert } from '../../../hooks/use-zenhub-alerts';
import type { SystemAlert } from '@edin/shared';

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function SeverityBadge({ severity }: { severity: 'CRITICAL' | 'WARNING' }) {
  const color = severity === 'CRITICAL' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800';
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {severity}
    </span>
  );
}

function AlertCard({
  alert,
  onDismiss,
  isDismissing,
}: {
  alert: SystemAlert;
  onDismiss: () => void;
  isDismissing: boolean;
}) {
  if (alert.dismissed) return null;

  const borderColor = alert.severity === 'CRITICAL' ? 'border-red-300' : 'border-amber-300';

  return (
    <div className={`rounded-lg border ${borderColor} bg-surface-raised p-[var(--spacing-md)]`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-[var(--spacing-sm)]">
            <SeverityBadge severity={alert.severity} />
            <span className="text-xs text-brand-secondary">
              {formatTimestamp(alert.occurredAt)}
            </span>
          </div>
          <p className="mt-[var(--spacing-xs)] text-sm text-brand-primary">{alert.message}</p>
          <p className="mt-[var(--spacing-xs)] text-xs text-brand-secondary">
            Current: {alert.currentValue} | Threshold: {alert.threshold}
          </p>
        </div>
        <button
          onClick={onDismiss}
          disabled={isDismissing}
          className="ml-[var(--spacing-md)] shrink-0 rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-sm)] py-[var(--spacing-xs)] text-xs text-brand-secondary transition-colors hover:text-brand-primary disabled:opacity-50"
          aria-label={`Dismiss ${alert.type} alert`}
        >
          {isDismissing ? 'Dismissing...' : 'Dismiss'}
        </button>
      </div>
    </div>
  );
}

export function ZenhubAlertsList() {
  const { alerts, isLoading } = useZenhubAlerts();
  const dismissMutation = useDismissZenhubAlert();

  if (isLoading) {
    return (
      <div className="py-[var(--spacing-md)] text-center text-brand-secondary">
        Loading alerts...
      </div>
    );
  }

  const activeAlerts = alerts.filter((a) => !a.dismissed);

  if (activeAlerts.length === 0) {
    return (
      <div className="py-[var(--spacing-md)] text-center text-brand-secondary">
        No active Zenhub alerts.
      </div>
    );
  }

  return (
    <div className="space-y-[var(--spacing-sm)]">
      {activeAlerts.map((alert) => (
        <AlertCard
          key={alert.id}
          alert={alert}
          onDismiss={() => dismissMutation.mutate(alert.id)}
          isDismissing={dismissMutation.isPending}
        />
      ))}
    </div>
  );
}

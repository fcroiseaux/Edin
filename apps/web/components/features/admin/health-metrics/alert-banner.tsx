'use client';

import type { SystemAlert } from '@edin/shared';

interface AlertBannerProps {
  alerts: SystemAlert[];
  onDismiss: (alertId: string) => void;
  isDismissing: boolean;
}

const SEVERITY_STYLES = {
  CRITICAL: 'border-red-300 bg-red-50 text-red-900',
  WARNING: 'border-yellow-300 bg-yellow-50 text-yellow-900',
} as const;

const SEVERITY_BADGE = {
  CRITICAL: 'bg-red-600 text-white',
  WARNING: 'bg-yellow-600 text-white',
} as const;

export function AlertBanner({ alerts, onDismiss, isDismissing }: AlertBannerProps) {
  const activeAlerts = alerts.filter((a) => !a.dismissed);

  if (activeAlerts.length === 0) return null;

  return (
    <div className="space-y-[var(--spacing-sm)]" role="alert" aria-label="System health alerts">
      {activeAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-start justify-between rounded-[var(--radius-lg)] border p-[var(--spacing-md)] ${SEVERITY_STYLES[alert.severity]}`}
        >
          <div className="flex-1">
            <div className="flex items-center gap-[var(--spacing-sm)]">
              <span
                className={`inline-flex rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[11px] font-bold uppercase ${SEVERITY_BADGE[alert.severity]}`}
              >
                {alert.severity}
              </span>
              <span className="font-sans text-[14px] font-medium">
                {alert.type.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="mt-[var(--spacing-xs)] font-serif text-[13px]">{alert.message}</p>
            <p className="mt-[var(--spacing-xs)] font-sans text-[12px] opacity-70">
              Current: {alert.currentValue} | Threshold: {alert.threshold} |{' '}
              {new Date(alert.occurredAt).toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(alert.id)}
            disabled={isDismissing}
            className="ml-[var(--spacing-md)] rounded-[var(--radius-md)] px-[var(--spacing-sm)] py-[var(--spacing-xs)] font-sans text-[13px] font-medium opacity-70 transition-opacity hover:opacity-100 disabled:opacity-40"
            aria-label={`Dismiss ${alert.type} alert`}
          >
            Dismiss
          </button>
        </div>
      ))}
    </div>
  );
}

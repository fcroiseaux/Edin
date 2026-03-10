'use client';

import { useState } from 'react';
import { useAuditLogs } from '../../../../hooks/use-audit-logs';
import { AuditLogFilters } from './audit-log-filters';
import type { AuditLogEntry } from '@edin/shared';

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function EventBadge({ action }: { action: string }) {
  let color = 'bg-brand-secondary/10 text-brand-secondary';
  if (action.includes('ROLE') || action.includes('FOUNDING')) {
    color = 'bg-amber-100 text-amber-800';
  } else if (action.includes('admission') || action.includes('APPLICATION')) {
    color = 'bg-blue-100 text-blue-800';
  } else if (action.includes('EVALUATION') || action.includes('evaluation')) {
    color = 'bg-purple-100 text-purple-800';
  } else if (action.includes('MODERATION') || action.includes('article')) {
    color = 'bg-red-100 text-red-800';
  } else if (action.includes('SETTING') || action.includes('scoring')) {
    color = 'bg-green-100 text-green-800';
  }
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>
      {action}
    </span>
  );
}

function DetailRow({ entry }: { entry: AuditLogEntry }) {
  return (
    <details className="mt-[var(--spacing-xs)]">
      <summary className="cursor-pointer text-xs text-brand-accent">View details</summary>
      <div className="mt-[var(--spacing-xs)] space-y-1 rounded-[var(--radius-sm)] bg-surface-base p-[var(--spacing-sm)] text-xs font-mono">
        {entry.previousState && (
          <div>
            <span className="font-semibold text-brand-secondary">Previous:</span>{' '}
            <span className="text-brand-primary">{JSON.stringify(entry.previousState)}</span>
          </div>
        )}
        {entry.newState && (
          <div>
            <span className="font-semibold text-brand-secondary">New:</span>{' '}
            <span className="text-brand-primary">{JSON.stringify(entry.newState)}</span>
          </div>
        )}
        {entry.reason && (
          <div>
            <span className="font-semibold text-brand-secondary">Reason:</span>{' '}
            <span className="text-brand-primary">{entry.reason}</span>
          </div>
        )}
        {entry.details && (
          <div>
            <span className="font-semibold text-brand-secondary">Details:</span>{' '}
            <span className="text-brand-primary">{JSON.stringify(entry.details)}</span>
          </div>
        )}
        {entry.correlationId && (
          <div>
            <span className="font-semibold text-brand-secondary">Correlation:</span>{' '}
            <span className="text-brand-primary">{entry.correlationId}</span>
          </div>
        )}
      </div>
    </details>
  );
}

export function AuditLogTable() {
  const [eventType, setEventType] = useState('');
  const [actorId, setActorId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [correlationId, setCorrelationId] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();

  const { logs, pagination, isLoading, isFetching } = useAuditLogs({
    eventType: eventType || undefined,
    actorId: actorId || undefined,
    targetId: targetId || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    correlationId: correlationId || undefined,
    cursor,
  });

  return (
    <div className="space-y-[var(--spacing-lg)]">
      <AuditLogFilters
        eventType={eventType}
        onEventTypeChange={(v) => {
          setEventType(v);
          setCursor(undefined);
        }}
        actorId={actorId}
        onActorIdChange={(v) => {
          setActorId(v);
          setCursor(undefined);
        }}
        targetId={targetId}
        onTargetIdChange={(v) => {
          setTargetId(v);
          setCursor(undefined);
        }}
        startDate={startDate}
        onStartDateChange={(v) => {
          setStartDate(v);
          setCursor(undefined);
        }}
        endDate={endDate}
        onEndDateChange={(v) => {
          setEndDate(v);
          setCursor(undefined);
        }}
        correlationId={correlationId}
        onCorrelationIdChange={(v) => {
          setCorrelationId(v);
          setCursor(undefined);
        }}
      />

      {isLoading ? (
        <div className="py-[var(--spacing-xl)] text-center text-brand-secondary">
          Loading audit logs...
        </div>
      ) : logs.length === 0 ? (
        <div className="py-[var(--spacing-xl)] text-center text-brand-secondary">
          No audit log entries found.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" role="table">
              <thead>
                <tr className="border-b border-surface-border text-xs font-medium text-brand-secondary">
                  <th className="px-[var(--spacing-sm)] py-[var(--spacing-xs)]">Timestamp</th>
                  <th className="px-[var(--spacing-sm)] py-[var(--spacing-xs)]">Event Type</th>
                  <th className="px-[var(--spacing-sm)] py-[var(--spacing-xs)]">Actor</th>
                  <th className="px-[var(--spacing-sm)] py-[var(--spacing-xs)]">Target</th>
                  <th className="px-[var(--spacing-sm)] py-[var(--spacing-xs)]">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((entry) => (
                  <tr key={entry.id} className="border-b border-surface-border last:border-b-0">
                    <td className="whitespace-nowrap px-[var(--spacing-sm)] py-[var(--spacing-sm)] text-xs text-brand-secondary">
                      {formatTimestamp(entry.createdAt)}
                    </td>
                    <td className="px-[var(--spacing-sm)] py-[var(--spacing-sm)]">
                      <EventBadge action={entry.action} />
                    </td>
                    <td className="px-[var(--spacing-sm)] py-[var(--spacing-sm)] text-brand-primary">
                      {entry.actorName ?? (entry.actorId ? entry.actorId.slice(0, 8) : 'System')}
                      {entry.actorRole && (
                        <span className="ml-1 text-xs text-brand-secondary">
                          ({entry.actorRole})
                        </span>
                      )}
                    </td>
                    <td className="px-[var(--spacing-sm)] py-[var(--spacing-sm)] text-xs text-brand-secondary">
                      {entry.entityType}: {entry.entityId.slice(0, 8)}...
                    </td>
                    <td className="px-[var(--spacing-sm)] py-[var(--spacing-sm)]">
                      <DetailRow entry={entry} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setCursor(undefined)}
              disabled={!cursor}
              className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-md)] py-[var(--spacing-xs)] text-sm text-brand-secondary transition-colors hover:text-brand-primary disabled:opacity-50"
            >
              First Page
            </button>
            {isFetching && <span className="text-xs text-brand-secondary">Loading...</span>}
            <button
              onClick={() => {
                if (pagination?.nextCursor) setCursor(pagination.nextCursor);
              }}
              disabled={!pagination?.hasMore}
              className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-md)] py-[var(--spacing-xs)] text-sm text-brand-secondary transition-colors hover:text-brand-primary disabled:opacity-50"
            >
              Next Page
            </button>
          </div>
        </>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useZenhubSyncLogs } from '../../../hooks/use-zenhub-sync-logs';
import type { ZenhubSyncLogEntry } from '@edin/shared';

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

function StatusBadge({ status }: { status: ZenhubSyncLogEntry['status'] }) {
  const colors: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-800',
    FAILED: 'bg-red-100 text-red-800',
    PROCESSING: 'bg-amber-100 text-amber-800',
    RECEIVED: 'bg-blue-100 text-blue-800',
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {status}
    </span>
  );
}

function SyncTypeBadge({ syncType }: { syncType: ZenhubSyncLogEntry['syncType'] }) {
  const colors: Record<string, string> = {
    WEBHOOK: 'bg-purple-100 text-purple-800',
    POLL: 'bg-blue-100 text-blue-800',
    BACKFILL: 'bg-teal-100 text-teal-800',
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[syncType] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {syncType}
    </span>
  );
}

function DetailRow({ entry }: { entry: ZenhubSyncLogEntry }) {
  return (
    <details className="mt-[var(--spacing-xs)]">
      <summary className="cursor-pointer text-xs text-brand-accent">View details</summary>
      <div className="mt-[var(--spacing-xs)] space-y-1 rounded-[var(--radius-sm)] bg-surface-base p-[var(--spacing-sm)] text-xs font-mono">
        {entry.errorMessage && (
          <div>
            <span className="font-semibold text-red-600">Error:</span>{' '}
            <span className="text-brand-primary">{entry.errorMessage}</span>
          </div>
        )}
        {entry.retryCount > 0 && (
          <div>
            <span className="font-semibold text-brand-secondary">Retries:</span>{' '}
            <span className="text-brand-primary">{entry.retryCount}</span>
          </div>
        )}
        {entry.payloadSummary && (
          <div>
            <span className="font-semibold text-brand-secondary">Payload:</span>{' '}
            <span className="text-brand-primary">{entry.payloadSummary}</span>
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

function SyncLogFilters({
  syncType,
  onSyncTypeChange,
  status,
  onStatusChange,
  eventType,
  onEventTypeChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  correlationId,
  onCorrelationIdChange,
}: {
  syncType: string;
  onSyncTypeChange: (v: string) => void;
  status: string;
  onStatusChange: (v: string) => void;
  eventType: string;
  onEventTypeChange: (v: string) => void;
  startDate: string;
  onStartDateChange: (v: string) => void;
  endDate: string;
  onEndDateChange: (v: string) => void;
  correlationId: string;
  onCorrelationIdChange: (v: string) => void;
}) {
  const selectClass =
    'rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-sm)] py-[var(--spacing-xs)] text-sm text-brand-primary';
  const inputClass =
    'rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-sm)] py-[var(--spacing-xs)] text-sm text-brand-primary';

  return (
    <div className="flex flex-wrap gap-[var(--spacing-sm)]">
      <select
        value={syncType}
        onChange={(e) => onSyncTypeChange(e.target.value)}
        className={selectClass}
        aria-label="Filter by sync type"
      >
        <option value="">All types</option>
        <option value="WEBHOOK">Webhook</option>
        <option value="POLL">Poll</option>
        <option value="BACKFILL">Backfill</option>
      </select>

      <select
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        className={selectClass}
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        <option value="RECEIVED">Received</option>
        <option value="PROCESSING">Processing</option>
        <option value="COMPLETED">Completed</option>
        <option value="FAILED">Failed</option>
      </select>

      <input
        type="text"
        placeholder="Event type..."
        value={eventType}
        onChange={(e) => onEventTypeChange(e.target.value)}
        className={inputClass}
        aria-label="Filter by event type"
      />

      <input
        type="datetime-local"
        value={startDate}
        onChange={(e) => onStartDateChange(e.target.value)}
        className={inputClass}
        aria-label="Start date"
      />

      <input
        type="datetime-local"
        value={endDate}
        onChange={(e) => onEndDateChange(e.target.value)}
        className={inputClass}
        aria-label="End date"
      />

      <input
        type="text"
        placeholder="Correlation ID..."
        value={correlationId}
        onChange={(e) => onCorrelationIdChange(e.target.value)}
        className={inputClass}
        aria-label="Filter by correlation ID"
      />
    </div>
  );
}

export function SyncLogTable() {
  const [syncType, setSyncType] = useState('');
  const [status, setStatus] = useState('');
  const [eventType, setEventType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [correlationId, setCorrelationId] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();

  const startDateIso = startDate ? new Date(startDate).toISOString() : undefined;
  const endDateIso = endDate ? new Date(endDate).toISOString() : undefined;

  const { logs, pagination, isLoading, isFetching } = useZenhubSyncLogs({
    syncType: syncType || undefined,
    status: status || undefined,
    eventType: eventType || undefined,
    startDate: startDateIso,
    endDate: endDateIso,
    correlationId: correlationId || undefined,
    cursor,
  });

  function resetCursor() {
    setCursor(undefined);
  }

  return (
    <div className="space-y-[var(--spacing-lg)]">
      <SyncLogFilters
        syncType={syncType}
        onSyncTypeChange={(v) => {
          setSyncType(v);
          resetCursor();
        }}
        status={status}
        onStatusChange={(v) => {
          setStatus(v);
          resetCursor();
        }}
        eventType={eventType}
        onEventTypeChange={(v) => {
          setEventType(v);
          resetCursor();
        }}
        startDate={startDate}
        onStartDateChange={(v) => {
          setStartDate(v);
          resetCursor();
        }}
        endDate={endDate}
        onEndDateChange={(v) => {
          setEndDate(v);
          resetCursor();
        }}
        correlationId={correlationId}
        onCorrelationIdChange={(v) => {
          setCorrelationId(v);
          resetCursor();
        }}
      />

      {isLoading ? (
        <div className="py-[var(--spacing-xl)] text-center text-brand-secondary">
          Loading sync logs...
        </div>
      ) : logs.length === 0 ? (
        <div className="py-[var(--spacing-xl)] text-center text-brand-secondary">
          No sync logs found.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" role="table">
              <thead>
                <tr className="border-b border-surface-border text-xs font-medium text-brand-secondary">
                  <th className="px-[var(--spacing-sm)] py-[var(--spacing-xs)]">Timestamp</th>
                  <th className="px-[var(--spacing-sm)] py-[var(--spacing-xs)]">Type</th>
                  <th className="px-[var(--spacing-sm)] py-[var(--spacing-xs)]">Event</th>
                  <th className="px-[var(--spacing-sm)] py-[var(--spacing-xs)]">Status</th>
                  <th className="px-[var(--spacing-sm)] py-[var(--spacing-xs)]">Duration</th>
                  <th className="px-[var(--spacing-sm)] py-[var(--spacing-xs)]">Records</th>
                  <th className="px-[var(--spacing-sm)] py-[var(--spacing-xs)]">Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((entry) => (
                  <tr key={entry.id} className="border-b border-surface-border last:border-b-0">
                    <td className="whitespace-nowrap px-[var(--spacing-sm)] py-[var(--spacing-sm)] text-xs text-brand-secondary">
                      {formatTimestamp(entry.receivedAt)}
                    </td>
                    <td className="px-[var(--spacing-sm)] py-[var(--spacing-sm)]">
                      <SyncTypeBadge syncType={entry.syncType} />
                    </td>
                    <td className="px-[var(--spacing-sm)] py-[var(--spacing-sm)] text-xs text-brand-primary">
                      {entry.eventType}
                    </td>
                    <td className="px-[var(--spacing-sm)] py-[var(--spacing-sm)]">
                      <StatusBadge status={entry.status} />
                    </td>
                    <td className="px-[var(--spacing-sm)] py-[var(--spacing-sm)] text-xs text-brand-secondary">
                      {entry.durationMs != null ? `${(entry.durationMs / 1000).toFixed(1)}s` : '—'}
                    </td>
                    <td className="px-[var(--spacing-sm)] py-[var(--spacing-sm)] text-xs text-brand-secondary">
                      {entry.recordsSynced != null ? entry.recordsSynced : '—'}
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
                if (pagination?.cursor) setCursor(pagination.cursor);
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

'use client';

import { useState } from 'react';
import { useZenhubSyncConflicts, useResolveConflict } from '../../../hooks/use-zenhub-alerts';
import type { ZenhubSyncConflictEntry, ZenhubSyncConflictDetail } from '@edin/shared';

const TASK_STATUSES = ['AVAILABLE', 'CLAIMED', 'IN_PROGRESS', 'COMPLETED'] as const;

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

function parseOutcome(outcome: string | null): ZenhubSyncConflictDetail | null {
  if (!outcome) return null;
  try {
    return JSON.parse(outcome) as ZenhubSyncConflictDetail;
  } catch {
    return null;
  }
}

function ResolutionBadge({ resolution }: { resolution: string }) {
  const colors: Record<string, string> = {
    'auto-resolved': 'bg-green-100 text-green-800',
    pending: 'bg-amber-100 text-amber-800',
    'manual-resolved': 'bg-blue-100 text-blue-800',
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${colors[resolution] ?? 'bg-gray-100 text-gray-800'}`}
    >
      {resolution}
    </span>
  );
}

function ConflictDetail({ detail }: { detail: ZenhubSyncConflictDetail }) {
  return (
    <div className="space-y-1 text-xs font-mono">
      <div>
        <span className="font-semibold text-brand-secondary">Edin Status:</span>{' '}
        <span className="text-brand-primary">{detail.edinStatus}</span>
      </div>
      <div>
        <span className="font-semibold text-brand-secondary">Zenhub Pipeline:</span>{' '}
        <span className="text-brand-primary">{detail.zenhubPipeline}</span>
      </div>
      {detail.zenhubMappedStatus && (
        <div>
          <span className="font-semibold text-brand-secondary">Mapped Status:</span>{' '}
          <span className="text-brand-primary">{detail.zenhubMappedStatus}</span>
        </div>
      )}
      {detail.appliedStatus && (
        <div>
          <span className="font-semibold text-brand-secondary">Applied:</span>{' '}
          <span className="text-brand-primary">{detail.appliedStatus}</span>
        </div>
      )}
      <div>
        <span className="font-semibold text-brand-secondary">Task:</span>{' '}
        <span className="text-brand-primary">{detail.taskId.slice(0, 8)}...</span>
      </div>
    </div>
  );
}

function ResolvePanel({
  entry,
  onResolved,
}: {
  entry: ZenhubSyncConflictEntry;
  onResolved: () => void;
}) {
  const [selectedStatus, setSelectedStatus] = useState('');
  const resolveConflict = useResolveConflict();
  const detail = parseOutcome(entry.outcome);

  const handleKeepEdin = () => {
    resolveConflict.mutate(
      { conflictId: entry.id, input: { action: 'keep-edin' } },
      { onSuccess: onResolved },
    );
  };

  const handleApplyStatus = () => {
    const status = selectedStatus || detail?.zenhubMappedStatus;
    if (!status) return;
    resolveConflict.mutate(
      { conflictId: entry.id, input: { action: 'apply-status', applyStatus: status } },
      { onSuccess: onResolved },
    );
  };

  const btnBase =
    'rounded-[var(--radius-md)] px-[var(--spacing-md)] py-[var(--spacing-xs)] text-xs font-medium transition-colors disabled:opacity-50';

  return (
    <div className="mt-[var(--spacing-sm)] space-y-[var(--spacing-sm)] rounded-[var(--radius-md)] border border-surface-border bg-surface-base p-[var(--spacing-md)]">
      {detail && <ConflictDetail detail={detail} />}

      {!detail && entry.outcome && (
        <div className="text-xs text-brand-secondary font-mono">{entry.outcome}</div>
      )}

      <div className="flex flex-wrap items-center gap-[var(--spacing-sm)] pt-[var(--spacing-xs)]">
        <button
          onClick={handleKeepEdin}
          disabled={resolveConflict.isPending}
          className={`${btnBase} border border-surface-border text-brand-secondary hover:text-brand-primary`}
        >
          Keep Edin State
        </button>

        <div className="flex items-center gap-[var(--spacing-xs)]">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-sm)] py-[var(--spacing-xs)] text-xs text-brand-primary"
            aria-label="Select status to apply"
          >
            <option value="">
              {detail?.zenhubMappedStatus
                ? `Apply: ${detail.zenhubMappedStatus}`
                : 'Select status...'}
            </option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={handleApplyStatus}
            disabled={resolveConflict.isPending || (!selectedStatus && !detail?.zenhubMappedStatus)}
            className={`${btnBase} bg-brand-accent text-white hover:opacity-90`}
          >
            Apply Status
          </button>
        </div>
      </div>

      {resolveConflict.isError && (
        <div className="text-xs text-red-600">
          Failed to resolve: {resolveConflict.error.message}
        </div>
      )}
    </div>
  );
}

function DetailRow({ entry }: { entry: ZenhubSyncConflictEntry }) {
  const [showResolve, setShowResolve] = useState(false);
  const detail = parseOutcome(entry.outcome);
  const isPending = entry.resolution === 'pending';

  return (
    <div className="mt-[var(--spacing-xs)]">
      <div className="flex items-center gap-[var(--spacing-sm)]">
        <button
          onClick={() => setShowResolve(!showResolve)}
          className="cursor-pointer text-xs text-brand-accent hover:underline"
        >
          {showResolve ? 'Hide details' : 'View details'}
        </button>
        {isPending && !showResolve && (
          <button
            onClick={() => setShowResolve(true)}
            className="rounded-[var(--radius-sm)] bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 hover:bg-amber-200"
          >
            Resolve
          </button>
        )}
      </div>

      {showResolve &&
        (isPending ? (
          <ResolvePanel entry={entry} onResolved={() => setShowResolve(false)} />
        ) : (
          <div className="mt-[var(--spacing-xs)] space-y-1 rounded-[var(--radius-sm)] bg-surface-base p-[var(--spacing-sm)]">
            {detail ? (
              <ConflictDetail detail={detail} />
            ) : entry.outcome ? (
              <div className="text-xs text-brand-primary font-mono">{entry.outcome}</div>
            ) : null}
            {entry.syncId && (
              <div className="text-xs font-mono">
                <span className="font-semibold text-brand-secondary">Sync ID:</span>{' '}
                <span className="text-brand-primary">{entry.syncId}</span>
              </div>
            )}
          </div>
        ))}
    </div>
  );
}

export function SyncConflictsTable() {
  const [resolution, setResolution] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();

  const startDateIso = startDate ? new Date(startDate).toISOString() : undefined;
  const endDateIso = endDate ? new Date(endDate).toISOString() : undefined;

  const { conflicts, pagination, isLoading, isFetching } = useZenhubSyncConflicts({
    resolution: resolution || undefined,
    startDate: startDateIso,
    endDate: endDateIso,
    cursor,
  });

  const selectClass =
    'rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-sm)] py-[var(--spacing-xs)] text-sm text-brand-primary';
  const inputClass =
    'rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-sm)] py-[var(--spacing-xs)] text-sm text-brand-primary';

  return (
    <div className="space-y-[var(--spacing-lg)]">
      <div className="flex flex-wrap gap-[var(--spacing-sm)]">
        <select
          value={resolution}
          onChange={(e) => {
            setResolution(e.target.value);
            setCursor(undefined);
          }}
          className={selectClass}
          aria-label="Filter by resolution"
        >
          <option value="">All resolutions</option>
          <option value="auto-resolved">Auto-resolved</option>
          <option value="pending">Pending</option>
          <option value="manual-resolved">Manual-resolved</option>
        </select>

        <input
          type="datetime-local"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setCursor(undefined);
          }}
          className={inputClass}
          aria-label="Start date"
        />

        <input
          type="datetime-local"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setCursor(undefined);
          }}
          className={inputClass}
          aria-label="End date"
        />
      </div>

      {isLoading ? (
        <div className="py-[var(--spacing-xl)] text-center text-brand-secondary">
          Loading sync conflicts...
        </div>
      ) : conflicts.length === 0 ? (
        <div className="py-[var(--spacing-xl)] text-center text-brand-secondary">
          No sync conflicts found.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" role="table">
              <thead>
                <tr className="border-b border-surface-border text-xs font-medium text-brand-secondary">
                  <th className="px-[var(--spacing-sm)] py-[var(--spacing-xs)]">Timestamp</th>
                  <th className="px-[var(--spacing-sm)] py-[var(--spacing-xs)]">Type</th>
                  <th className="px-[var(--spacing-sm)] py-[var(--spacing-xs)]">Entity</th>
                  <th className="px-[var(--spacing-sm)] py-[var(--spacing-xs)]">Resolution</th>
                  <th className="px-[var(--spacing-sm)] py-[var(--spacing-xs)]">Resolved By</th>
                  <th className="px-[var(--spacing-sm)] py-[var(--spacing-xs)]">Details</th>
                </tr>
              </thead>
              <tbody>
                {conflicts.map((entry) => (
                  <tr key={entry.id} className="border-b border-surface-border last:border-b-0">
                    <td className="whitespace-nowrap px-[var(--spacing-sm)] py-[var(--spacing-sm)] text-xs text-brand-secondary">
                      {formatTimestamp(entry.occurredAt)}
                    </td>
                    <td className="px-[var(--spacing-sm)] py-[var(--spacing-sm)] text-xs text-brand-primary">
                      {entry.conflictType}
                    </td>
                    <td className="px-[var(--spacing-sm)] py-[var(--spacing-sm)] text-xs text-brand-primary">
                      {entry.affectedEntity}
                    </td>
                    <td className="px-[var(--spacing-sm)] py-[var(--spacing-sm)]">
                      <ResolutionBadge resolution={entry.resolution} />
                    </td>
                    <td className="px-[var(--spacing-sm)] py-[var(--spacing-sm)] text-xs text-brand-secondary">
                      {entry.resolvedBy ? entry.resolvedBy.slice(0, 8) + '...' : 'System'}
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

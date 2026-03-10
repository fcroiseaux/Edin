'use client';

import { AUDIT_EVENT_TYPES } from '@edin/shared';

interface AuditLogFiltersProps {
  eventType: string;
  onEventTypeChange: (value: string) => void;
  actorId: string;
  onActorIdChange: (value: string) => void;
  targetId: string;
  onTargetIdChange: (value: string) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  correlationId: string;
  onCorrelationIdChange: (value: string) => void;
}

const EVENT_TYPE_OPTIONS = [
  { value: '', label: 'All Event Types' },
  ...AUDIT_EVENT_TYPES.map((t) => ({ value: t, label: t })),
];

export function AuditLogFilters({
  eventType,
  onEventTypeChange,
  actorId,
  onActorIdChange,
  targetId,
  onTargetIdChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  correlationId,
  onCorrelationIdChange,
}: AuditLogFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-[var(--spacing-md)]">
      <div className="flex flex-col gap-[var(--spacing-xs)]">
        <label htmlFor="event-type-filter" className="text-xs font-medium text-brand-secondary">
          Event Type
        </label>
        <select
          id="event-type-filter"
          value={eventType}
          onChange={(e) => onEventTypeChange(e.target.value)}
          className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-sm)] py-[var(--spacing-xs)] text-sm text-brand-primary"
        >
          {EVENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-[var(--spacing-xs)]">
        <label htmlFor="actor-id-filter" className="text-xs font-medium text-brand-secondary">
          Actor ID
        </label>
        <input
          id="actor-id-filter"
          type="text"
          value={actorId}
          onChange={(e) => onActorIdChange(e.target.value)}
          placeholder="Search by actor ID"
          className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-sm)] py-[var(--spacing-xs)] text-sm text-brand-primary placeholder:text-brand-tertiary"
        />
      </div>

      <div className="flex flex-col gap-[var(--spacing-xs)]">
        <label htmlFor="target-id-filter" className="text-xs font-medium text-brand-secondary">
          Target ID
        </label>
        <input
          id="target-id-filter"
          type="text"
          value={targetId}
          onChange={(e) => onTargetIdChange(e.target.value)}
          placeholder="Search by target ID"
          className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-sm)] py-[var(--spacing-xs)] text-sm text-brand-primary placeholder:text-brand-tertiary"
        />
      </div>

      <div className="flex flex-col gap-[var(--spacing-xs)]">
        <label htmlFor="start-date-filter" className="text-xs font-medium text-brand-secondary">
          Start Date
        </label>
        <input
          id="start-date-filter"
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-sm)] py-[var(--spacing-xs)] text-sm text-brand-primary"
        />
      </div>

      <div className="flex flex-col gap-[var(--spacing-xs)]">
        <label htmlFor="end-date-filter" className="text-xs font-medium text-brand-secondary">
          End Date
        </label>
        <input
          id="end-date-filter"
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-sm)] py-[var(--spacing-xs)] text-sm text-brand-primary"
        />
      </div>

      <div className="flex flex-col gap-[var(--spacing-xs)]">
        <label htmlFor="correlation-filter" className="text-xs font-medium text-brand-secondary">
          Correlation ID
        </label>
        <input
          id="correlation-filter"
          type="text"
          value={correlationId}
          onChange={(e) => onCorrelationIdChange(e.target.value)}
          placeholder="Search by correlation ID"
          className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-sm)] py-[var(--spacing-xs)] text-sm text-brand-primary placeholder:text-brand-tertiary"
        />
      </div>
    </div>
  );
}

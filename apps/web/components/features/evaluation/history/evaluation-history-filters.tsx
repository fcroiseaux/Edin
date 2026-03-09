'use client';

interface EvaluationHistoryFiltersProps {
  contributionType: string;
  timePeriod: string;
  onContributionTypeChange: (type: string) => void;
  onTimePeriodChange: (period: string) => void;
}

const CONTRIBUTION_TYPES = [
  { value: '', label: 'All' },
  { value: 'COMMIT', label: 'Code' },
  { value: 'PULL_REQUEST', label: 'Pull Requests' },
  { value: 'DOCUMENTATION', label: 'Documentation' },
];

const TIME_PERIODS = [
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 6 months' },
  { value: '365', label: 'Last year' },
  { value: '', label: 'All time' },
];

export function EvaluationHistoryFilters({
  contributionType,
  timePeriod,
  onContributionTypeChange,
  onTimePeriodChange,
}: EvaluationHistoryFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-[var(--spacing-md)]">
      <div className="flex rounded-[var(--radius-md)] border border-surface-border bg-surface-base">
        {CONTRIBUTION_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => onContributionTypeChange(type.value)}
            className={`px-[var(--spacing-md)] py-[var(--spacing-xs)] font-sans text-[13px] transition-colors first:rounded-l-[var(--radius-md)] last:rounded-r-[var(--radius-md)] ${
              contributionType === type.value
                ? 'bg-brand-accent text-white'
                : 'text-brand-secondary hover:bg-surface-sunken hover:text-brand-primary'
            }`}
            aria-pressed={contributionType === type.value}
          >
            {type.label}
          </button>
        ))}
      </div>

      <select
        value={timePeriod}
        onChange={(e) => onTimePeriodChange(e.target.value)}
        className="rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-xs)] font-sans text-[13px] text-brand-primary"
        aria-label="Time period filter"
      >
        {TIME_PERIODS.map((period) => (
          <option key={period.value} value={period.value}>
            {period.label}
          </option>
        ))}
      </select>
    </div>
  );
}

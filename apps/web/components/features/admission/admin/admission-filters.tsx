'use client';

import * as Select from '@radix-ui/react-select';

const DOMAINS = ['Technology', 'Fintech', 'Impact', 'Governance'];
const STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DECLINED', label: 'Declined' },
];

interface AdmissionFiltersProps {
  activeDomain: string | null;
  activeStatus: string | null;
  onDomainChange: (domain: string | null) => void;
  onStatusChange: (status: string | null) => void;
}

export function AdmissionFilters({
  activeDomain,
  activeStatus,
  onDomainChange,
  onStatusChange,
}: AdmissionFiltersProps) {
  return (
    <div className="flex flex-wrap gap-[var(--spacing-sm)]">
      <Select.Root
        value={activeDomain ?? ''}
        onValueChange={(val) => onDomainChange(val === 'all' ? null : val)}
      >
        <Select.Trigger
          className="flex min-h-[40px] min-w-[160px] items-center justify-between rounded-[var(--radius-md)] border border-surface-border-input bg-surface-raised px-[var(--spacing-sm)] py-[var(--spacing-xs)] font-sans text-[14px] text-brand-primary outline-none transition-[border-color] duration-[var(--transition-fast)] focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
          aria-label="Filter by domain"
        >
          <Select.Value placeholder="All Domains" />
          <Select.Icon className="ml-[var(--spacing-xs)] text-brand-secondary">
            <ChevronDownIcon />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            className="z-50 overflow-hidden rounded-[var(--radius-md)] border border-surface-border bg-surface-raised shadow-[var(--shadow-modal)]"
            position="popper"
            sideOffset={4}
          >
            <Select.Viewport className="p-[var(--spacing-xs)]">
              <Select.Item
                value="all"
                className="flex min-h-[36px] cursor-pointer items-center rounded-[var(--radius-sm)] px-[var(--spacing-sm)] py-[var(--spacing-xs)] font-sans text-[14px] text-brand-primary outline-none data-[highlighted]:bg-surface-sunken"
              >
                <Select.ItemText>All Domains</Select.ItemText>
              </Select.Item>
              {DOMAINS.map((d) => (
                <Select.Item
                  key={d}
                  value={d}
                  className="flex min-h-[36px] cursor-pointer items-center rounded-[var(--radius-sm)] px-[var(--spacing-sm)] py-[var(--spacing-xs)] font-sans text-[14px] text-brand-primary outline-none data-[highlighted]:bg-surface-sunken"
                >
                  <Select.ItemText>{d}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>

      <Select.Root
        value={activeStatus ?? ''}
        onValueChange={(val) => onStatusChange(val === 'all' ? null : val)}
      >
        <Select.Trigger
          className="flex min-h-[40px] min-w-[160px] items-center justify-between rounded-[var(--radius-md)] border border-surface-border-input bg-surface-raised px-[var(--spacing-sm)] py-[var(--spacing-xs)] font-sans text-[14px] text-brand-primary outline-none transition-[border-color] duration-[var(--transition-fast)] focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
          aria-label="Filter by status"
        >
          <Select.Value placeholder="All Statuses" />
          <Select.Icon className="ml-[var(--spacing-xs)] text-brand-secondary">
            <ChevronDownIcon />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            className="z-50 overflow-hidden rounded-[var(--radius-md)] border border-surface-border bg-surface-raised shadow-[var(--shadow-modal)]"
            position="popper"
            sideOffset={4}
          >
            <Select.Viewport className="p-[var(--spacing-xs)]">
              <Select.Item
                value="all"
                className="flex min-h-[36px] cursor-pointer items-center rounded-[var(--radius-sm)] px-[var(--spacing-sm)] py-[var(--spacing-xs)] font-sans text-[14px] text-brand-primary outline-none data-[highlighted]:bg-surface-sunken"
              >
                <Select.ItemText>All Statuses</Select.ItemText>
              </Select.Item>
              {STATUSES.map((s) => (
                <Select.Item
                  key={s.value}
                  value={s.value}
                  className="flex min-h-[36px] cursor-pointer items-center rounded-[var(--radius-sm)] px-[var(--spacing-sm)] py-[var(--spacing-xs)] font-sans text-[14px] text-brand-primary outline-none data-[highlighted]:bg-surface-sunken"
                >
                  <Select.ItemText>{s.label}</Select.ItemText>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

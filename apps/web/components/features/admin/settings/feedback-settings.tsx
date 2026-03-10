'use client';

import type { PlatformSettingsSection } from '@edin/shared';

interface FeedbackSettingsProps {
  section: PlatformSettingsSection;
  onSave: (updates: Record<string, unknown>) => void;
  isPending: boolean;
}

export function FeedbackSettings({ section, onSave, isPending }: FeedbackSettingsProps) {
  const slaHours = (section.settings['feedback.sla_threshold_hours'] as number) ?? 48;
  const maxConcurrent = (section.settings['feedback.max_concurrent_assignments'] as number) ?? 3;
  const autoReassignHours = (section.settings['feedback.auto_reassignment_hours'] as number) ?? 72;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSave({
      'feedback.sla_threshold_hours': Number(formData.get('feedback.sla_threshold_hours')),
      'feedback.max_concurrent_assignments': Number(
        formData.get('feedback.max_concurrent_assignments'),
      ),
      'feedback.auto_reassignment_hours': Number(formData.get('feedback.auto_reassignment_hours')),
    });
  };

  return (
    <form onSubmit={handleSubmit} data-section="Feedback Assignment Rules">
      <div className="space-y-[var(--spacing-md)]">
        <div>
          <label
            htmlFor="sla-hours"
            className="mb-[var(--spacing-xs)] block text-[13px] font-medium text-brand-secondary"
          >
            SLA Threshold (hours)
          </label>
          <input
            id="sla-hours"
            name="feedback.sla_threshold_hours"
            type="number"
            defaultValue={slaHours}
            min={1}
            max={720}
            className="w-[120px] rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] text-[14px] text-brand-primary"
          />
        </div>

        <div>
          <label
            htmlFor="max-concurrent"
            className="mb-[var(--spacing-xs)] block text-[13px] font-medium text-brand-secondary"
          >
            Max Concurrent Assignments
          </label>
          <input
            id="max-concurrent"
            name="feedback.max_concurrent_assignments"
            type="number"
            defaultValue={maxConcurrent}
            min={1}
            max={20}
            className="w-[120px] rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] text-[14px] text-brand-primary"
          />
        </div>

        <div>
          <label
            htmlFor="auto-reassign"
            className="mb-[var(--spacing-xs)] block text-[13px] font-medium text-brand-secondary"
          >
            Auto-Reassignment (hours)
          </label>
          <input
            id="auto-reassign"
            name="feedback.auto_reassignment_hours"
            type="number"
            defaultValue={autoReassignHours}
            min={1}
            max={720}
            className="w-[120px] rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] text-[14px] text-brand-primary"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-[var(--spacing-md)] rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[var(--spacing-sm)] text-[14px] font-medium text-white hover:bg-brand-accent/90 disabled:opacity-50"
      >
        {isPending ? 'Saving...' : 'Save Feedback Settings'}
      </button>
    </form>
  );
}

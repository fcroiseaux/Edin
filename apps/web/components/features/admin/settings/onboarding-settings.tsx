'use client';

import type { PlatformSettingsSection } from '@edin/shared';

interface OnboardingSettingsProps {
  section: PlatformSettingsSection;
  onSave: (updates: Record<string, unknown>) => void;
  isPending: boolean;
}

export function OnboardingSettings({ section, onSave, isPending }: OnboardingSettingsProps) {
  const ignitionHours = (section.settings['onboarding.ignition_timeline_hours'] as number) ?? 72;
  const buddyRules = (section.settings['onboarding.buddy_assignment_rules'] as {
    maxAssignments: number;
    domainMatch: boolean;
  }) ?? { maxAssignments: 3, domainMatch: true };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSave({
      'onboarding.ignition_timeline_hours': Number(
        formData.get('onboarding.ignition_timeline_hours'),
      ),
      'onboarding.buddy_assignment_rules': {
        maxAssignments: Number(formData.get('buddy_max_assignments')),
        domainMatch: formData.get('buddy_domain_match') === 'on',
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} data-section="Onboarding Parameters">
      <div className="space-y-[var(--spacing-md)]">
        <div>
          <label
            htmlFor="ignition-hours"
            className="mb-[var(--spacing-xs)] block text-[13px] font-medium text-brand-secondary"
          >
            72-Hour Ignition Timeline (hours)
          </label>
          <input
            id="ignition-hours"
            name="onboarding.ignition_timeline_hours"
            type="number"
            defaultValue={ignitionHours}
            min={1}
            max={720}
            className="w-[120px] rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] text-[14px] text-brand-primary"
          />
        </div>

        <div>
          <label
            htmlFor="buddy-max"
            className="mb-[var(--spacing-xs)] block text-[13px] font-medium text-brand-secondary"
          >
            Max Buddy Assignments per Buddy
          </label>
          <input
            id="buddy-max"
            name="buddy_max_assignments"
            type="number"
            defaultValue={buddyRules.maxAssignments}
            min={1}
            max={20}
            className="w-[120px] rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] text-[14px] text-brand-primary"
          />
        </div>

        <div className="flex items-center gap-[var(--spacing-sm)]">
          <input
            id="buddy-domain"
            name="buddy_domain_match"
            type="checkbox"
            defaultChecked={buddyRules.domainMatch}
            className="h-4 w-4 rounded border-surface-border"
          />
          <label htmlFor="buddy-domain" className="text-[13px] font-medium text-brand-secondary">
            Require domain match for buddy assignment
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-[var(--spacing-md)] rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[var(--spacing-sm)] text-[14px] font-medium text-white hover:bg-brand-accent/90 disabled:opacity-50"
      >
        {isPending ? 'Saving...' : 'Save Onboarding Settings'}
      </button>
    </form>
  );
}

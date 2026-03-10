'use client';

import Link from 'next/link';
import { useAdminSettings, useUpdateAdminSettings } from '../../../../hooks/use-admin-settings';
import { GithubReposSettings } from '../../../../components/features/admin/settings/github-repos-settings';
import { FeedbackSettings } from '../../../../components/features/admin/settings/feedback-settings';
import { OnboardingSettings } from '../../../../components/features/admin/settings/onboarding-settings';

export default function AdminSettingsPage() {
  const { sections, isLoading, error } = useAdminSettings();
  const updateSettings = useUpdateAdminSettings();

  const handleSave = (section: string, updates: Record<string, unknown>) => {
    updateSettings.mutate({ section, updates });
  };

  const githubSection = sections.find((s) => s.section === 'github');
  const feedbackSection = sections.find((s) => s.section === 'feedback');
  const onboardingSection = sections.find((s) => s.section === 'onboarding');

  return (
    <div className="p-[var(--spacing-xl)]">
      <h1 className="mb-[var(--spacing-xl)] font-serif text-[24px] font-bold text-brand-primary">
        Platform Settings
      </h1>

      {error && (
        <div className="mb-[var(--spacing-md)] rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-[var(--spacing-md)] text-[14px] text-red-700">
          Failed to load settings: {error.message}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-[var(--spacing-lg)]">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[200px] animate-pulse rounded-[var(--radius-lg)] bg-surface-border"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-[var(--spacing-lg)]">
          {/* GitHub Repos */}
          {githubSection && (
            <section className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
              <div className="mb-[var(--spacing-md)] flex items-center justify-between">
                <h2 className="font-sans text-[16px] font-semibold text-brand-primary">
                  {githubSection.label}
                </h2>
                {githubSection.updatedAt && (
                  <span className="text-[12px] text-brand-secondary">
                    Last updated: {new Date(githubSection.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <GithubReposSettings
                section={githubSection}
                onSave={(updates) => handleSave('github', updates)}
                isPending={updateSettings.isPending}
              />
            </section>
          )}

          {/* Feedback Rules */}
          {feedbackSection && (
            <section className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
              <div className="mb-[var(--spacing-md)] flex items-center justify-between">
                <h2 className="font-sans text-[16px] font-semibold text-brand-primary">
                  {feedbackSection.label}
                </h2>
                {feedbackSection.updatedAt && (
                  <span className="text-[12px] text-brand-secondary">
                    Last updated: {new Date(feedbackSection.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <FeedbackSettings
                section={feedbackSection}
                onSave={(updates) => handleSave('feedback', updates)}
                isPending={updateSettings.isPending}
              />
            </section>
          )}

          {/* Onboarding Parameters */}
          {onboardingSection && (
            <section className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
              <div className="mb-[var(--spacing-md)] flex items-center justify-between">
                <h2 className="font-sans text-[16px] font-semibold text-brand-primary">
                  {onboardingSection.label}
                </h2>
                {onboardingSection.updatedAt && (
                  <span className="text-[12px] text-brand-secondary">
                    Last updated: {new Date(onboardingSection.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <OnboardingSettings
                section={onboardingSection}
                onSave={(updates) => handleSave('onboarding', updates)}
                isPending={updateSettings.isPending}
              />
            </section>
          )}

          {/* Scoring Formula Link */}
          <section className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-sans text-[16px] font-semibold text-brand-primary">
                  Scoring Formula Configuration
                </h2>
                <p className="mt-[var(--spacing-xs)] text-[13px] text-brand-secondary">
                  Manage scoring weights, multipliers, and formula versioning
                </p>
              </div>
              <Link
                href="/admin/settings/scoring"
                className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-lg)] py-[var(--spacing-sm)] text-[14px] font-medium text-brand-accent hover:bg-brand-accent/10"
              >
                Open Scoring Settings
              </Link>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

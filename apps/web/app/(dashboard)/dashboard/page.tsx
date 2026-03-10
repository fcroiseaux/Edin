'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useProfile } from '../../../hooks/use-profile';
import { OnboardingWelcome } from '../../../components/features/onboarding/onboarding-welcome';

const DOMAIN_COLORS: Record<string, { bg: string; text: string }> = {
  Technology: { bg: 'bg-domain-technology', text: 'text-white' },
  Fintech: { bg: 'bg-domain-fintech', text: 'text-white' },
  Impact: { bg: 'bg-domain-impact', text: 'text-white' },
  Governance: { bg: 'bg-domain-governance', text: 'text-white' },
};

const ROLE_LABELS: Record<string, string> = {
  CONTRIBUTOR: 'Contributor',
  FOUNDING_CONTRIBUTOR: 'Founding Contributor',
  WORKING_GROUP_LEAD: 'Working Group Lead',
  EDITOR: 'Editor',
  ADMIN: 'Admin',
};

export default function DashboardPage() {
  const { profile, isLoading } = useProfile();

  if (isLoading) {
    return (
      <main className="min-h-screen bg-surface-base px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <div className="mx-auto max-w-[56rem]">
          <div className="skeleton h-[32px] w-[250px]" />
          <div className="mt-[var(--spacing-lg)] skeleton h-[140px] w-full rounded-[var(--radius-lg)]" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-surface-base px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <div className="mx-auto max-w-[56rem]">
        <h1 className="font-serif text-[32px] leading-[1.25] font-bold text-brand-primary">
          Welcome to Edin
        </h1>

        {/* Profile Summary Card */}
        {profile && (
          <div className="mt-[var(--spacing-lg)] flex items-center gap-[var(--spacing-md)] rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={`${profile.name}'s profile photo`}
                width={64}
                height={64}
                className="h-[64px] w-[64px] shrink-0 rounded-full border border-surface-border object-cover"
              />
            ) : (
              <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full border border-surface-border bg-surface-sunken">
                <span className="font-sans text-[24px] font-medium text-brand-secondary">
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1">
              <h2 className="font-serif text-[20px] font-bold text-brand-primary">
                {profile.name}
              </h2>
              <div className="mt-[var(--spacing-xs)] flex flex-wrap items-center gap-[var(--spacing-xs)]">
                <span className="inline-flex items-center rounded-[var(--radius-sm)] border border-surface-border bg-surface-sunken px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium text-brand-secondary">
                  {ROLE_LABELS[profile.role] || profile.role}
                </span>
                {profile.domain && DOMAIN_COLORS[profile.domain] && (
                  <span
                    className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${DOMAIN_COLORS[profile.domain].bg} ${DOMAIN_COLORS[profile.domain].text}`}
                  >
                    {profile.domain}
                  </span>
                )}
              </div>
            </div>
            <Link
              href="/dashboard/profile"
              className="inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-md)] font-sans text-[15px] font-medium text-surface-raised transition-opacity duration-[var(--transition-fast)] hover:opacity-90"
            >
              Edit Profile
            </Link>
          </div>
        )}

        {/* Onboarding welcome — shown for contributors */}
        {profile && profile.role === 'CONTRIBUTOR' && (
          <div className="mt-[var(--spacing-lg)]">
            <OnboardingWelcome />
          </div>
        )}

        {/* Dashboard Sections */}
        <div className="mt-[var(--spacing-2xl)] space-y-[var(--spacing-lg)]">
          <section className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <h2 className="font-sans text-[16px] font-medium text-brand-primary">
                Contribution History
              </h2>
              <Link
                href="/dashboard/contributions"
                className="inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-md)] font-sans text-[14px] font-medium text-brand-secondary transition-colors duration-[var(--transition-fast)] hover:bg-surface-sunken"
              >
                View Contributions
              </Link>
            </div>
            <p className="mt-[var(--spacing-sm)] font-serif text-[15px] leading-[1.65] text-brand-secondary">
              Track your contributions from connected GitHub repositories.
            </p>
          </section>
          <section className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <h2 className="font-sans text-[16px] font-medium text-brand-primary">
                Working Groups
              </h2>
              <Link
                href="/dashboard/working-groups"
                className="inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-md)] font-sans text-[14px] font-medium text-brand-secondary transition-colors duration-[var(--transition-fast)] hover:bg-surface-sunken"
              >
                View Working Groups
              </Link>
            </div>
            <p className="mt-[var(--spacing-sm)] font-serif text-[15px] leading-[1.65] text-brand-secondary">
              Connect with contributors in your domain and collaborate on shared goals.
            </p>
          </section>
          <PlaceholderSection
            title="Evaluation Scores"
            message="Your evaluation journey will be displayed here as you contribute."
          />
          <PlaceholderSection
            title="Peer Feedback"
            message="Feedback from your peers will appear here."
          />
        </div>
      </div>
    </main>
  );
}

function PlaceholderSection({ title, message }: { title: string; message: string }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
      <h2 className="font-sans text-[16px] font-medium text-brand-primary">{title}</h2>
      <p className="mt-[var(--spacing-sm)] font-serif text-[15px] leading-[1.65] text-brand-secondary">
        {message}
      </p>
    </section>
  );
}

'use client';

import Image from 'next/image';
import type { PublicContributorProfile } from '@edin/shared';
import { ContributorScoreSummary } from '../evaluation/public/contributor-score-summary';

const DOMAIN_COLORS: Record<string, { bg: string; text: string }> = {
  Technology: { bg: 'bg-domain-technology', text: 'text-white' },
  Fintech: { bg: 'bg-domain-fintech', text: 'text-black' },
  Impact: { bg: 'bg-domain-impact', text: 'text-black' },
  Governance: { bg: 'bg-domain-governance', text: 'text-white' },
};

const ROLE_LABELS: Record<string, string> = {
  CONTRIBUTOR: 'Contributor',
  FOUNDING_CONTRIBUTOR: 'Founding Contributor',
  WORKING_GROUP_LEAD: 'Working Group Lead',
  EDITOR: 'Editor',
  ADMIN: 'Admin',
};

interface PublicProfileViewProps {
  profile: PublicContributorProfile;
}

export function PublicProfileView({ profile }: PublicProfileViewProps) {
  const domainColor = profile.domain ? DOMAIN_COLORS[profile.domain] : null;
  const roleLabel = ROLE_LABELS[profile.role] || profile.role;
  const isFoundingContributor = profile.role === 'FOUNDING_CONTRIBUTOR';
  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <article className="mx-auto max-w-[48rem]">
      {/* Profile Header */}
      <div className="flex flex-col items-center gap-[var(--spacing-lg)] rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-xl)] shadow-[var(--shadow-card)] md:flex-row md:items-start">
        {/* Avatar */}
        {profile.avatarUrl ? (
          <Image
            src={profile.avatarUrl}
            alt={`${profile.name}'s profile photo`}
            width={120}
            height={120}
            className="h-[120px] w-[120px] shrink-0 rounded-full border-2 border-surface-border object-cover"
          />
        ) : (
          <div
            className="flex h-[120px] w-[120px] shrink-0 items-center justify-center rounded-full border-2 border-surface-border bg-surface-sunken"
            aria-label={`${profile.name}'s profile photo placeholder`}
          >
            <span className="font-sans text-[40px] font-medium text-brand-secondary">
              {profile.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Name, Role, Domain */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="font-serif text-[28px] leading-[1.3] font-bold text-brand-primary">
            {profile.name}
          </h1>

          {/* Role Badge */}
          <div className="mt-[var(--spacing-xs)] flex flex-wrap items-center justify-center gap-[var(--spacing-xs)] md:justify-start">
            <span
              className={`inline-flex items-center rounded-[var(--radius-sm)] px-[var(--spacing-sm)] py-[2px] font-sans text-[13px] font-medium ${
                isFoundingContributor
                  ? 'border border-brand-accent bg-brand-accent-subtle text-brand-primary'
                  : 'border border-surface-border bg-surface-sunken text-brand-secondary'
              }`}
            >
              {isFoundingContributor && (
                <svg
                  className="mr-[4px] h-[14px] w-[14px] text-brand-accent"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 1l2.09 4.26L15 6.27l-3.5 3.42L12.18 15 8 12.77 3.82 15l.68-5.31L1 6.27l4.91-1.01L8 1z" />
                </svg>
              )}
              {roleLabel}
            </span>

            {/* Domain Badge */}
            {profile.domain && domainColor && (
              <span
                className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[13px] font-medium ${domainColor.bg} ${domainColor.text}`}
              >
                {profile.domain}
              </span>
            )}
          </div>

          {/* Member Since */}
          <p className="mt-[var(--spacing-sm)] font-sans text-[13px] text-brand-secondary">
            Member since {memberSince}
          </p>
        </div>
      </div>

      {/* Bio Section */}
      {profile.bio && (
        <section className="mt-[var(--spacing-2xl)]" aria-label="Biography">
          <h2 className="font-sans text-[14px] font-medium uppercase tracking-wider text-brand-secondary">
            About
          </h2>
          <p className="mt-[var(--spacing-sm)] font-serif text-[17px] leading-[1.65] text-brand-primary">
            {profile.bio}
          </p>
        </section>
      )}

      {/* Skill Areas */}
      {profile.skillAreas.length > 0 && (
        <section className="mt-[var(--spacing-2xl)]" aria-label="Skill areas">
          <h2 className="font-sans text-[14px] font-medium uppercase tracking-wider text-brand-secondary">
            Skills
          </h2>
          <div className="mt-[var(--spacing-sm)] flex flex-wrap gap-[var(--spacing-xs)]">
            {profile.skillAreas.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center rounded-full bg-surface-sunken px-[var(--spacing-sm)] py-[var(--spacing-xs)] font-sans text-[13px] text-brand-primary"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Evaluation Summary — invisible absence if not consented */}
      <ContributorScoreSummary
        contributorId={profile.id}
        showEvaluationScores={profile.showEvaluationScores}
      />

      <section className="mt-[var(--spacing-2xl)]" aria-label="Contribution history">
        <h2 className="font-sans text-[14px] font-medium uppercase tracking-wider text-brand-secondary">
          Contribution History
        </h2>
        <p className="mt-[var(--spacing-sm)] font-serif text-[15px] leading-[1.65] text-brand-secondary">
          Contribution history will appear here once repository integrations are connected.
        </p>
      </section>
    </article>
  );
}

export function PublicProfileSkeleton() {
  return (
    <div className="mx-auto max-w-[48rem]" role="status" aria-label="Loading profile">
      {/* Header Skeleton */}
      <div className="flex flex-col items-center gap-[var(--spacing-lg)] rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-xl)] shadow-[var(--shadow-card)] md:flex-row md:items-start">
        <div className="skeleton h-[120px] w-[120px] shrink-0 rounded-full" />
        <div className="flex-1 space-y-[var(--spacing-sm)]">
          <div className="skeleton mx-auto h-[32px] w-[200px] md:mx-0" />
          <div className="skeleton mx-auto h-[24px] w-[150px] md:mx-0" />
          <div className="skeleton mx-auto h-[16px] w-[120px] md:mx-0" />
        </div>
      </div>

      {/* Bio Skeleton */}
      <div className="mt-[var(--spacing-2xl)] space-y-[var(--spacing-sm)]">
        <div className="skeleton h-[16px] w-[60px]" />
        <div className="skeleton h-[20px] w-full" />
        <div className="skeleton h-[20px] w-[80%]" />
      </div>

      {/* Skills Skeleton */}
      <div className="mt-[var(--spacing-2xl)] space-y-[var(--spacing-sm)]">
        <div className="skeleton h-[16px] w-[60px]" />
        <div className="flex gap-[var(--spacing-xs)]">
          <div className="skeleton h-[28px] w-[80px] rounded-full" />
          <div className="skeleton h-[28px] w-[100px] rounded-full" />
          <div className="skeleton h-[28px] w-[70px] rounded-full" />
        </div>
      </div>
    </div>
  );
}

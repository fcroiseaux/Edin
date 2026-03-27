'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useProfile } from '../../../hooks/use-profile';
import { useWorkingGroups } from '../../../hooks/use-working-groups';
import { useContributions } from '../../../hooks/use-contributions';
import { useMyScores } from '../../../hooks/use-scores';
import { useReceivedFeedback } from '../../../hooks/use-received-feedback';
import { usePendingAssignments } from '../../../hooks/use-feedback-review';
import { usePrizeAwards } from '../../../hooks/use-prize-awards';
import { OnboardingWelcome } from '../../../components/features/onboarding/onboarding-welcome';

const DOMAIN_COLORS: Record<string, { bg: string; text: string }> = {
  Technology: { bg: 'bg-domain-technology', text: 'text-white' },
  Finance: { bg: 'bg-domain-finance', text: 'text-text-primary' },
  Impact: { bg: 'bg-domain-impact', text: 'text-text-primary' },
  Governance: { bg: 'bg-domain-governance', text: 'text-white' },
};

const ROLE_LABELS: Record<string, string> = {
  CONTRIBUTOR: 'Contributor',
  FOUNDING_CONTRIBUTOR: 'Founding Contributor',
  WORKING_GROUP_LEAD: 'Working Group Lead',
  EDITOR: 'Editor',
  ADMIN: 'Admin',
};

const CONTRIBUTION_TYPE_ICONS: Record<string, string> = {
  COMMIT: '\u2299',
  PULL_REQUEST: '\u2443',
  CODE_REVIEW: '\u25CE',
};

const SIGNIFICANCE_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Notable', color: 'text-text-secondary' },
  2: { label: 'Significant', color: 'text-accent-primary' },
  3: { label: 'Exceptional', color: 'text-[#D97706]' },
};

const TREND_LABELS: Record<string, { label: string; color: string }> = {
  RISING: { label: 'Rising', color: 'text-semantic-success' },
  STABLE: { label: 'Stable', color: 'text-text-secondary' },
  DECLINING: { label: 'Declining', color: 'text-semantic-error' },
};

export default function DashboardPage() {
  const { profile, isLoading } = useProfile();
  const { workingGroups, isLoading: isGroupsLoading } = useWorkingGroups();
  const joinedGroups = workingGroups.filter((g) => g.isMember);
  const { contributions, isLoading: isContribLoading } = useContributions();
  const { summary: scoreSummary, isLoading: isScoresLoading } = useMyScores();
  const { items: receivedFeedback, isPending: isFeedbackLoading } = useReceivedFeedback();
  const { data: pendingData, isLoading: isPendingLoading } = usePendingAssignments();
  const { awards: prizeAwards, isLoading: isPrizesLoading } = usePrizeAwards();

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
        <h1 className="font-serif text-[32px] leading-[1.25] font-bold text-text-primary">
          Welcome to Edin
        </h1>

        {/* Profile Summary Card */}
        {profile && (
          <div className="mt-[var(--spacing-lg)] flex items-center gap-[var(--spacing-md)] rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={`${profile.name}'s profile photo`}
                width={64}
                height={64}
                className="h-[64px] w-[64px] shrink-0 rounded-full border border-surface-subtle object-cover"
              />
            ) : (
              <div className="flex h-[64px] w-[64px] shrink-0 items-center justify-center rounded-full border border-surface-subtle bg-surface-sunken">
                <span className="font-sans text-[24px] font-medium text-text-secondary">
                  {profile.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1">
              <h2 className="font-serif text-[20px] font-bold text-text-primary">{profile.name}</h2>
              <div className="mt-[var(--spacing-xs)] flex flex-wrap items-center gap-[var(--spacing-xs)]">
                <span className="inline-flex items-center rounded-[var(--radius-sm)] border border-surface-subtle bg-surface-sunken px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium text-text-secondary">
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
              className="inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] bg-accent-primary px-[var(--spacing-md)] font-sans text-[15px] font-medium text-surface-raised transition-opacity duration-[var(--transition-fast)] hover:opacity-90"
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
          <section className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <h2 className="font-sans text-[16px] font-medium text-text-primary">
                Contribution History
              </h2>
              <Link
                href="/dashboard/contributions"
                className="inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] border border-surface-subtle px-[var(--spacing-md)] font-sans text-[14px] font-medium text-text-secondary transition-colors duration-[var(--transition-fast)] hover:bg-surface-sunken"
              >
                View Contributions
              </Link>
            </div>
            {isContribLoading ? (
              <div className="mt-[var(--spacing-md)] space-y-[var(--spacing-sm)]">
                <div className="skeleton h-[44px] w-full rounded-[var(--radius-md)]" />
                <div className="skeleton h-[44px] w-full rounded-[var(--radius-md)]" />
                <div className="skeleton h-[44px] w-full rounded-[var(--radius-md)]" />
              </div>
            ) : contributions.length > 0 ? (
              <>
                <p className="mt-[var(--spacing-sm)] font-sans text-[14px] text-text-secondary">
                  {contributions.length} contribution{contributions.length !== 1 ? 's' : ''} tracked
                </p>
                <ul className="mt-[var(--spacing-md)] space-y-[var(--spacing-sm)]">
                  {contributions.slice(0, 3).map((c) => (
                    <li key={c.id}>
                      <Link
                        href="/dashboard/contributions"
                        className="flex items-center gap-[var(--spacing-md)] rounded-[var(--radius-md)] border border-surface-subtle p-[var(--spacing-md)] transition-colors duration-[var(--transition-fast)] hover:bg-surface-sunken"
                      >
                        <span className="font-mono text-[16px] text-text-secondary">
                          {CONTRIBUTION_TYPE_ICONS[c.contributionType] ?? '\u25CB'}
                        </span>
                        <span className="flex-1 truncate font-serif text-[14px] text-text-primary">
                          {c.title}
                        </span>
                        <span className="shrink-0 font-sans text-[12px] text-text-secondary">
                          {c.repositoryName}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-[var(--spacing-sm)] font-serif text-[15px] leading-[1.65] text-text-secondary">
                No contributions tracked yet. Connect your GitHub repositories to get started.
              </p>
            )}
          </section>
          <section className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <h2 className="font-sans text-[16px] font-medium text-text-primary">
                Working Groups
              </h2>
              <Link
                href="/dashboard/working-groups"
                className="inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] border border-surface-subtle px-[var(--spacing-md)] font-sans text-[14px] font-medium text-text-secondary transition-colors duration-[var(--transition-fast)] hover:bg-surface-sunken"
              >
                View Working Groups
              </Link>
            </div>
            {isGroupsLoading ? (
              <div className="mt-[var(--spacing-md)] space-y-[var(--spacing-sm)]">
                <div className="skeleton h-[48px] w-full rounded-[var(--radius-md)]" />
                <div className="skeleton h-[48px] w-full rounded-[var(--radius-md)]" />
              </div>
            ) : joinedGroups.length > 0 ? (
              <ul className="mt-[var(--spacing-md)] space-y-[var(--spacing-sm)]">
                {joinedGroups.map((group) => (
                  <li key={group.id}>
                    <Link
                      href={`/dashboard/working-groups/${group.id}`}
                      className="flex items-center gap-[var(--spacing-md)] rounded-[var(--radius-md)] border border-surface-subtle p-[var(--spacing-md)] transition-colors duration-[var(--transition-fast)] hover:bg-surface-sunken"
                    >
                      <span
                        className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[2px] font-sans text-[12px] font-medium ${DOMAIN_COLORS[group.domain] ? `${DOMAIN_COLORS[group.domain].bg} ${DOMAIN_COLORS[group.domain].text}` : 'bg-surface-sunken text-text-secondary'}`}
                      >
                        {group.domain}
                      </span>
                      <span className="flex-1 font-serif text-[15px] font-medium text-text-primary">
                        {group.name}
                      </span>
                      <span className="font-sans text-[13px] text-text-secondary">
                        {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-[var(--spacing-sm)] font-serif text-[15px] leading-[1.65] text-text-secondary">
                You haven&apos;t joined any working groups yet. Connect with contributors in your
                domain and collaborate on shared goals.
              </p>
            )}
          </section>
          <section className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <h2 className="font-sans text-[16px] font-medium text-text-primary">
                Evaluation Scores
              </h2>
              <Link
                href="/evaluations"
                className="inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] border border-surface-subtle px-[var(--spacing-md)] font-sans text-[14px] font-medium text-text-secondary transition-colors duration-[var(--transition-fast)] hover:bg-surface-sunken"
              >
                View Evaluations
              </Link>
            </div>
            {isScoresLoading ? (
              <div className="mt-[var(--spacing-md)] flex gap-[var(--spacing-lg)]">
                <div className="skeleton h-[60px] w-[120px] rounded-[var(--radius-md)]" />
                <div className="skeleton h-[60px] w-[120px] rounded-[var(--radius-md)]" />
                <div className="skeleton h-[60px] w-[120px] rounded-[var(--radius-md)]" />
              </div>
            ) : scoreSummary?.monthlyAggregate ? (
              <div className="mt-[var(--spacing-md)] flex flex-wrap gap-[var(--spacing-lg)]">
                <div>
                  <p className="font-sans text-[13px] text-text-secondary">Monthly Score</p>
                  <p className="font-serif text-[28px] font-bold text-text-primary">
                    {Math.round(scoreSummary.monthlyAggregate.aggregatedScore)}
                  </p>
                </div>
                <div>
                  <p className="font-sans text-[13px] text-text-secondary">Contributions</p>
                  <p className="font-serif text-[28px] font-bold text-text-primary">
                    {scoreSummary.monthlyAggregate.contributionCount}
                  </p>
                </div>
                <div>
                  <p className="font-sans text-[13px] text-text-secondary">Trend</p>
                  <p
                    className={`font-serif text-[28px] font-bold ${TREND_LABELS[scoreSummary.monthlyAggregate.trend]?.color ?? 'text-text-secondary'}`}
                  >
                    {TREND_LABELS[scoreSummary.monthlyAggregate.trend]?.label ??
                      scoreSummary.monthlyAggregate.trend}
                  </p>
                </div>
              </div>
            ) : scoreSummary?.latestSessionScore ? (
              <div className="mt-[var(--spacing-md)]">
                <p className="font-sans text-[13px] text-text-secondary">Latest Score</p>
                <p className="font-serif text-[28px] font-bold text-text-primary">
                  {Math.round(scoreSummary.latestSessionScore.compositeScore)}
                </p>
              </div>
            ) : (
              <p className="mt-[var(--spacing-sm)] font-serif text-[15px] leading-[1.65] text-text-secondary">
                Your evaluation journey will be displayed here as you contribute.
              </p>
            )}
          </section>
          {/* Prizes Section */}
          <section className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <h2 className="font-sans text-[16px] font-medium text-text-primary">Prizes</h2>
            </div>
            {isPrizesLoading ? (
              <div className="mt-[var(--spacing-md)] space-y-[var(--spacing-sm)]">
                <div className="skeleton h-[60px] w-full rounded-[var(--radius-md)]" />
                <div className="skeleton h-[60px] w-full rounded-[var(--radius-md)]" />
              </div>
            ) : prizeAwards.length > 0 ? (
              <ul className="mt-[var(--spacing-md)] space-y-[var(--spacing-sm)]">
                {prizeAwards.slice(0, 3).map((award) => {
                  const sig =
                    SIGNIFICANCE_LABELS[award.significanceLevel] ?? SIGNIFICANCE_LABELS[1];
                  return (
                    <li
                      key={award.id}
                      className="flex items-start gap-[var(--spacing-md)] rounded-[var(--radius-md)] border border-surface-subtle p-[var(--spacing-md)]"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-[var(--spacing-xs)]">
                          <span className="font-serif text-[14px] font-medium text-text-primary">
                            {award.prizeCategoryName}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-[var(--spacing-sm)] py-[1px] font-sans text-[11px] font-medium ${sig.color} bg-surface-sunken`}
                          >
                            {sig.label}
                          </span>
                        </div>
                        <p className="mt-[2px] font-sans text-[13px] text-text-secondary truncate">
                          {award.narrative.length > 120
                            ? `${award.narrative.slice(0, 120)}...`
                            : award.narrative}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="font-sans text-[12px] text-text-secondary">
                          {award.channelName}
                        </span>
                        <p className="font-sans text-[11px] text-text-tertiary">
                          {new Date(award.awardedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-[var(--spacing-sm)] font-serif text-[15px] leading-[1.65] text-text-secondary">
                No prizes awarded yet. Prizes are awarded for cross-domain collaboration,
                breakthrough contributions, and community recognition.
              </p>
            )}
          </section>

          <section className="rounded-[var(--radius-lg)] border border-surface-subtle bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <h2 className="font-sans text-[16px] font-medium text-text-primary">Peer Feedback</h2>
              <Link
                href="/dashboard/feedback"
                className="inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] border border-surface-subtle px-[var(--spacing-md)] font-sans text-[14px] font-medium text-text-secondary transition-colors duration-[var(--transition-fast)] hover:bg-surface-sunken"
              >
                View Feedback
              </Link>
            </div>
            {isFeedbackLoading || isPendingLoading ? (
              <div className="mt-[var(--spacing-md)] flex gap-[var(--spacing-lg)]">
                <div className="skeleton h-[60px] w-[140px] rounded-[var(--radius-md)]" />
                <div className="skeleton h-[60px] w-[140px] rounded-[var(--radius-md)]" />
              </div>
            ) : receivedFeedback.length > 0 || (pendingData?.data?.length ?? 0) > 0 ? (
              <div className="mt-[var(--spacing-md)] flex flex-wrap gap-[var(--spacing-lg)]">
                <div>
                  <p className="font-sans text-[13px] text-text-secondary">Feedback Received</p>
                  <p className="font-serif text-[28px] font-bold text-text-primary">
                    {receivedFeedback.length}
                  </p>
                </div>
                {(pendingData?.data?.length ?? 0) > 0 && (
                  <div>
                    <p className="font-sans text-[13px] text-text-secondary">Pending Reviews</p>
                    <Link
                      href="/dashboard/feedback"
                      className="font-serif text-[28px] font-bold text-accent-primary hover:underline"
                    >
                      {pendingData!.data.length}
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <p className="mt-[var(--spacing-sm)] font-serif text-[15px] leading-[1.65] text-text-secondary">
                Feedback from your peers will appear here.
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

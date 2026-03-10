'use client';

import { useProfile } from '../../../../hooks/use-profile';
import { ProfileForm } from '../../../../components/features/contributor-profile/profile-form';
import { BuddyOptInToggle } from '../../../../components/features/onboarding/buddy-opt-in-toggle';
import { ToastProvider } from '../../../../components/ui/toast';

function ProfileSkeleton() {
  return (
    <div className="space-y-[var(--spacing-lg)]">
      <div>
        <div className="skeleton h-[16px] w-[100px]" />
        <div className="skeleton mt-[var(--spacing-xs)] h-[44px] w-full" />
      </div>
      <div>
        <div className="skeleton h-[16px] w-[40px]" />
        <div className="skeleton mt-[var(--spacing-xs)] h-[100px] w-full" />
      </div>
      <div>
        <div className="skeleton h-[16px] w-[120px]" />
        <div className="skeleton mt-[var(--spacing-xs)] h-[44px] w-full" />
      </div>
      <div>
        <div className="skeleton h-[16px] w-[90px]" />
        <div className="skeleton mt-[var(--spacing-xs)] h-[44px] w-full" />
      </div>
      <div>
        <div className="skeleton h-[16px] w-[130px]" />
        <div className="skeleton mt-[var(--spacing-xs)] h-[44px] w-full" />
      </div>
      <div className="skeleton h-[44px] w-[140px]" />
    </div>
  );
}

export default function ProfilePage() {
  const { profile, isLoading } = useProfile();

  return (
    <main className="min-h-screen bg-surface-base px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <div className="mx-auto max-w-[42rem]">
        <h1 className="font-serif text-[32px] leading-[1.25] font-bold text-brand-primary">
          Edit Profile
        </h1>
        <p className="mt-[var(--spacing-sm)] font-sans text-[15px] leading-[1.5] text-brand-secondary">
          Update your profile information visible to other contributors.
        </p>

        <div className="mt-[var(--spacing-xl)]">
          {isLoading || !profile ? (
            <ProfileSkeleton />
          ) : (
            <ToastProvider>
              <ProfileForm
                defaultValues={{
                  name: profile.name,
                  bio: profile.bio,
                  domain: profile.domain,
                  avatarUrl: profile.avatarUrl,
                  skillAreas: profile.skillAreas,
                }}
              />
              {/* Buddy opt-in toggle — visible for contributors+ */}
              {profile.role !== 'PUBLIC' && profile.role !== 'APPLICANT' && (
                <div className="mt-[var(--spacing-xl)]">
                  <BuddyOptInToggle initialOptIn={profile.buddyOptIn} />
                </div>
              )}
            </ToastProvider>
          )}
        </div>
      </div>
    </main>
  );
}

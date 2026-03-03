import type { Metadata } from 'next';
import Link from 'next/link';
import type { PublicContributorProfile } from '@edin/shared';
import { PublicProfileClient } from './client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface PageProps {
  params: Promise<{ id: string }>;
}

type PublicProfileFetchResult =
  | { status: 'ok'; profile: PublicContributorProfile }
  | { status: 'not-found'; profile: null }
  | { status: 'error'; profile: null };

async function fetchPublicProfile(id: string): Promise<PublicProfileFetchResult> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/contributors/${id}`, {
      next: { revalidate: 60 },
    });

    if (response.status === 404) {
      return { status: 'not-found', profile: null };
    }

    if (!response.ok) {
      return { status: 'error', profile: null };
    }

    const body = await response.json();
    return { status: 'ok', profile: body.data };
  } catch {
    return { status: 'error', profile: null };
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await fetchPublicProfile(id);

  if (result.status !== 'ok') {
    return { title: 'Contributor Not Found | Edin' };
  }

  const profile = result.profile;

  const description = profile.bio
    ? profile.bio.slice(0, 160)
    : `${profile.name} is a contributor on the Edin platform.`;

  return {
    title: `${profile.name} | Edin`,
    description,
    openGraph: {
      title: `${profile.name} | Edin`,
      description,
      ...(profile.avatarUrl ? { images: [{ url: profile.avatarUrl }] } : {}),
    },
    twitter: {
      card: 'summary',
      title: `${profile.name} | Edin`,
      description,
    },
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { id } = await params;
  const result = await fetchPublicProfile(id);

  if (result.status === 'not-found') {
    return <ProfileNotFound />;
  }

  if (result.status === 'error') {
    return <ProfileUnavailable />;
  }

  const { profile } = result;

  return <PublicProfileClient profile={profile} />;
}

function ProfileNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-base px-[var(--spacing-lg)]">
      <div className="text-center">
        <h1 className="font-serif text-[28px] font-bold text-brand-primary">
          Contributor Not Found
        </h1>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] text-brand-secondary">
          The contributor profile you are looking for does not exist or has been removed.
        </p>
        <Link
          href="/"
          className="mt-[var(--spacing-lg)] inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-md)] font-sans text-[15px] font-medium text-surface-raised transition-opacity duration-[var(--transition-fast)] hover:opacity-90"
        >
          Return Home
        </Link>
      </div>
    </main>
  );
}

function ProfileUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-base px-[var(--spacing-lg)]">
      <div className="text-center">
        <h1 className="font-serif text-[28px] font-bold text-brand-primary">Profile Unavailable</h1>
        <p className="mt-[var(--spacing-md)] font-sans text-[15px] text-brand-secondary">
          We are unable to load this contributor profile right now. Please try again shortly.
        </p>
      </div>
    </main>
  );
}

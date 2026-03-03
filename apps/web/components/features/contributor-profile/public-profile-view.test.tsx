import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PublicProfileView, PublicProfileSkeleton } from './public-profile-view';
import type { PublicContributorProfile } from '@edin/shared';

const baseProfile: PublicContributorProfile = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Jane Smith',
  avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
  bio: 'A passionate developer working on open source projects.',
  domain: 'Technology',
  skillAreas: ['TypeScript', 'NestJS', 'React'],
  role: 'CONTRIBUTOR',
  createdAt: '2025-06-15T10:00:00Z',
};

describe('PublicProfileView', () => {
  it('renders all profile fields correctly', () => {
    render(<PublicProfileView profile={baseProfile} />);

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(
      screen.getByText('A passionate developer working on open source projects.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Contributor')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('NestJS')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Member since June 2025')).toBeInTheDocument();
    expect(screen.getByAltText("Jane Smith's profile photo")).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('alt', "Jane Smith's profile photo");
  });

  it('displays domain badge with correct color class for Technology', () => {
    render(<PublicProfileView profile={baseProfile} />);

    const domainBadge = screen.getByText('Technology');
    expect(domainBadge).toHaveClass('bg-domain-technology');
  });

  it('displays domain badge with correct color class for Fintech', () => {
    render(<PublicProfileView profile={{ ...baseProfile, domain: 'Fintech' }} />);

    const domainBadge = screen.getByText('Fintech');
    expect(domainBadge).toHaveClass('bg-domain-fintech');
  });

  it('displays domain badge with correct color class for Impact', () => {
    render(<PublicProfileView profile={{ ...baseProfile, domain: 'Impact' }} />);

    const domainBadge = screen.getByText('Impact');
    expect(domainBadge).toHaveClass('bg-domain-impact');
  });

  it('displays domain badge with correct color class for Governance', () => {
    render(<PublicProfileView profile={{ ...baseProfile, domain: 'Governance' }} />);

    const domainBadge = screen.getByText('Governance');
    expect(domainBadge).toHaveClass('bg-domain-governance');
  });

  it('displays Founding Contributor badge when role is FOUNDING_CONTRIBUTOR', () => {
    render(<PublicProfileView profile={{ ...baseProfile, role: 'FOUNDING_CONTRIBUTOR' }} />);

    const badge = screen.getByText('Founding Contributor');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('border-brand-accent');
    expect(badge).toHaveClass('bg-brand-accent-subtle');
  });

  it('renders contribution history placeholder section', () => {
    render(<PublicProfileView profile={baseProfile} />);

    expect(screen.getByText('Contribution History')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Contribution history will appear here once repository integrations are connected.',
      ),
    ).toBeInTheDocument();
  });

  it('renders placeholder avatar when avatarUrl is null', () => {
    render(<PublicProfileView profile={{ ...baseProfile, avatarUrl: null }} />);

    expect(screen.getByText('J')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('does not render bio section when bio is null', () => {
    render(<PublicProfileView profile={{ ...baseProfile, bio: null }} />);

    expect(screen.queryByText('About')).not.toBeInTheDocument();
  });

  it('does not render skills section when skillAreas is empty', () => {
    render(<PublicProfileView profile={{ ...baseProfile, skillAreas: [] }} />);

    expect(screen.queryByText('Skills')).not.toBeInTheDocument();
  });
});

describe('PublicProfileSkeleton', () => {
  it('displays loading skeleton', () => {
    render(<PublicProfileSkeleton />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading profile')).toBeInTheDocument();
  });
});

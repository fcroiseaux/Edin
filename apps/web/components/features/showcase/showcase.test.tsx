import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PublicContributorProfile } from '@edin/shared';
import { HeroSection, HeroSkeleton } from './hero-section';
import { FoundingCircle, FoundingCircleSkeleton } from './founding-circle';
import { FoundingContributorCard } from './founding-contributor-card';
import { ShowcaseSkeleton } from './showcase-skeleton';

const mockContributor: PublicContributorProfile = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Jane Smith',
  avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
  bio: 'A passionate developer working on open source projects.',
  domain: 'Technology',
  skillAreas: ['TypeScript', 'NestJS'],
  role: 'FOUNDING_CONTRIBUTOR',
  createdAt: '2025-06-15T10:00:00Z',
};

const mockContributor2: PublicContributorProfile = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'John Doe',
  avatarUrl: null,
  bio: 'Finance specialist building the future of finance.',
  domain: 'Finance',
  skillAreas: ['Python', 'ML'],
  role: 'FOUNDING_CONTRIBUTOR',
  createdAt: '2025-07-01T10:00:00Z',
};

describe('HeroSection', () => {
  it('renders heading "Where Expertise Becomes Publication"', () => {
    render(<HeroSection />);

    expect(screen.getByText('Where Expertise Becomes Publication')).toBeInTheDocument();
  });

  it('renders value proposition text', () => {
    render(<HeroSection />);

    expect(
      screen.getByText(/evaluated by AI, rewarded through scaling-law economics/),
    ).toBeInTheDocument();
  });

  it('uses h1 heading for SEO', () => {
    render(<HeroSection />);

    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Where Expertise Becomes Publication');
  });
});

describe('FoundingCircle', () => {
  it('renders correct number of contributor cards', () => {
    render(<FoundingCircle contributors={[mockContributor, mockContributor2]} />);

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('renders Founding Circle heading as h2', () => {
    render(<FoundingCircle contributors={[mockContributor]} />);

    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Founding Circle');
  });

  it('renders dignified empty state message when array is empty', () => {
    render(<FoundingCircle contributors={[]} />);

    expect(
      screen.getByText(
        'The Founding Circle is forming. Serious contributors are building something different.',
      ),
    ).toBeInTheDocument();
  });

  it('does not render empty state when contributors exist', () => {
    render(<FoundingCircle contributors={[mockContributor]} />);

    expect(screen.queryByText(/The Founding Circle is forming/)).not.toBeInTheDocument();
  });
});

describe('FoundingContributorCard', () => {
  it('renders contributor avatar, name, and bio', () => {
    render(<FoundingContributorCard contributor={mockContributor} />);

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(
      screen.getByText('A passionate developer working on open source projects.'),
    ).toBeInTheDocument();
    expect(screen.getByAltText('Jane Smith')).toBeInTheDocument();
  });

  it('renders domain badge with correct color for Technology', () => {
    render(<FoundingContributorCard contributor={mockContributor} />);

    const badge = screen.getByText('Technology');
    expect(badge).toHaveClass('bg-domain-technology');
  });

  it('renders domain badge with correct color for Finance', () => {
    render(<FoundingContributorCard contributor={mockContributor2} />);

    const badge = screen.getByText('Finance');
    expect(badge).toHaveClass('bg-domain-finance');
  });

  it('renders domain badge with correct color for Impact', () => {
    render(<FoundingContributorCard contributor={{ ...mockContributor, domain: 'Impact' }} />);

    const badge = screen.getByText('Impact');
    expect(badge).toHaveClass('bg-domain-impact');
  });

  it('renders domain badge with correct color for Governance', () => {
    render(<FoundingContributorCard contributor={{ ...mockContributor, domain: 'Governance' }} />);

    const badge = screen.getByText('Governance');
    expect(badge).toHaveClass('bg-domain-governance');
  });

  it('renders link to contributor profile page', () => {
    render(<FoundingContributorCard contributor={mockContributor} />);

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `/contributors/${mockContributor.id}`);
  });

  it('renders placeholder avatar when avatarUrl is null', () => {
    render(<FoundingContributorCard contributor={mockContributor2} />);

    const initial = screen.getByText('J');

    expect(initial).toBeInTheDocument();
    expect(initial.parentElement).toHaveClass('bg-domain-finance');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

describe('HeroSkeleton', () => {
  it('renders loading skeleton with status role', () => {
    render(<HeroSkeleton />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading hero section')).toBeInTheDocument();
  });
});

describe('FoundingCircleSkeleton', () => {
  it('renders loading skeleton with status role', () => {
    render(<FoundingCircleSkeleton />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByLabelText('Loading founding circle')).toBeInTheDocument();
  });
});

describe('ShowcaseSkeleton', () => {
  it('renders combined skeleton with status role', () => {
    render(<ShowcaseSkeleton />);

    expect(screen.getByLabelText('Loading showcase page')).toBeInTheDocument();
  });
});

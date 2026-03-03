import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import DashboardPage from './page';

const mockProfile = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  githubId: 12345,
  name: 'Test User',
  email: 'test@example.com',
  bio: 'A test bio',
  avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
  domain: 'Technology',
  skillAreas: ['TypeScript'],
  role: 'CONTRIBUTOR',
  isActive: true,
  createdAt: '2025-06-15T10:00:00Z',
  updatedAt: '2025-06-15T10:00:00Z',
};

vi.mock('../../../hooks/use-profile', () => ({
  useProfile: vi.fn(() => ({
    profile: mockProfile,
    isLoading: false,
    error: null,
  })),
}));

describe('DashboardPage', () => {
  it('renders placeholder sections with correct empty state messages', () => {
    render(<DashboardPage />);

    expect(
      screen.getByText(
        'Contributions will appear here once your GitHub repositories are connected.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Your evaluation journey will be displayed here as you contribute.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Feedback from your peers will appear here.')).toBeInTheDocument();
  });

  it('renders profile summary card with user data', () => {
    render(<DashboardPage />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Contributor')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
  });

  it('renders section titles for all placeholder sections', () => {
    render(<DashboardPage />);

    expect(screen.getByText('Contribution History')).toBeInTheDocument();
    expect(screen.getByText('Evaluation Scores')).toBeInTheDocument();
    expect(screen.getByText('Peer Feedback')).toBeInTheDocument();
  });
});

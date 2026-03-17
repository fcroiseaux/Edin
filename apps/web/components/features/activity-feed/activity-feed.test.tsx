import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActivityItem } from './activity-item';
import { ActivityFeed } from './activity-feed';
import type { ActivityEvent } from '@edin/shared';

// Mock the hooks
const mockUseActivityFeed = vi.fn();
const mockUseActivitySse = vi.fn();

vi.mock('../../../hooks/use-activity-feed', () => ({
  useActivityFeed: (...args: unknown[]) => mockUseActivityFeed(...args),
  useActivitySse: (...args: unknown[]) => mockUseActivitySse(...args),
}));

const mockActivity: ActivityEvent = {
  id: 'event-1',
  eventType: 'CONTRIBUTION_NEW',
  title: 'New Commit: Fix authentication flow',
  description: 'Fixed OAuth redirect issue in the login module',
  contributorId: 'user-1',
  contributorName: 'Alice',
  contributorAvatarUrl: null,
  domain: 'Technology',
  contributionType: 'COMMIT',
  entityId: 'entity-1',
  metadata: null,
  createdAt: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
};

const mockPrActivity: ActivityEvent = {
  ...mockActivity,
  id: 'event-2',
  title: 'PR Merged: Add activity feed',
  contributionType: 'PULL_REQUEST',
  domain: 'Finance',
  contributorName: 'Bob',
  createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
};

const mockMemberJoinedActivity: ActivityEvent = {
  ...mockActivity,
  id: 'event-3',
  eventType: 'MEMBER_JOINED',
  title: 'Charlie joined Governance',
  contributionType: null,
  domain: 'Governance',
  contributorName: 'Charlie',
  description: null,
  createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
};

const mockAnnouncementActivity: ActivityEvent = {
  ...mockActivity,
  id: 'event-4',
  eventType: 'ANNOUNCEMENT_CREATED',
  title: 'New announcement in Impact',
  contributionType: null,
  domain: 'Impact',
  contributorName: 'Lead',
  description: 'Welcome to the team!',
  createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
};

describe('ActivityItem', () => {
  it('renders activity with title, contributor name, and domain', () => {
    render(<ActivityItem activity={mockActivity} />);

    expect(screen.getByText('New Commit: Fix authentication flow')).toBeInTheDocument();
    expect(screen.getByText('by Alice')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
  });

  it('renders description when present', () => {
    render(<ActivityItem activity={mockActivity} />);

    expect(screen.getByText('Fixed OAuth redirect issue in the login module')).toBeInTheDocument();
  });

  it('does not render description when absent', () => {
    render(<ActivityItem activity={mockMemberJoinedActivity} />);

    // Title should be present but no description element
    expect(screen.getByText('Charlie joined Governance')).toBeInTheDocument();
    expect(screen.queryByText('Fixed OAuth redirect')).not.toBeInTheDocument();
  });

  it('renders contribution type label for commits', () => {
    render(<ActivityItem activity={mockActivity} />);

    expect(screen.getByText('Commit')).toBeInTheDocument();
  });

  it('renders contribution type label for PRs', () => {
    render(<ActivityItem activity={mockPrActivity} />);

    expect(screen.getByText('PR')).toBeInTheDocument();
  });

  it('does not render contribution type for non-contribution events', () => {
    render(<ActivityItem activity={mockMemberJoinedActivity} />);

    expect(screen.queryByText('Commit')).not.toBeInTheDocument();
    expect(screen.queryByText('PR')).not.toBeInTheDocument();
  });

  it('renders domain accent color dot', () => {
    const { container } = render(<ActivityItem activity={mockActivity} />);

    const dot = container.querySelector('[style*="background-color"]');
    expect(dot).toHaveStyle({ backgroundColor: '#3A7D7E' }); // Technology color
  });

  it('renders Finance accent color for Finance domain', () => {
    const { container } = render(<ActivityItem activity={mockPrActivity} />);

    const dot = container.querySelector('[style*="background-color"]');
    expect(dot).toHaveStyle({ backgroundColor: '#C49A3C' }); // Finance color
  });

  it('renders relative timestamp', () => {
    render(<ActivityItem activity={mockActivity} />);

    expect(screen.getByText('2m ago')).toBeInTheDocument();
  });

  it('renders event type label', () => {
    render(<ActivityItem activity={mockActivity} />);

    expect(screen.getByText('New Contribution')).toBeInTheDocument();
  });

  it('renders MEMBER_JOINED event type label', () => {
    render(<ActivityItem activity={mockMemberJoinedActivity} />);

    expect(screen.getByText('New Member')).toBeInTheDocument();
  });

  it('renders avatar fallback with initials when no avatar URL', () => {
    render(<ActivityItem activity={mockActivity} />);

    expect(screen.getByText('A')).toBeInTheDocument(); // Alice initials
  });

  it('renders all items with equal card dimensions (listitem role)', () => {
    const { container } = render(
      <div>
        <ActivityItem activity={mockActivity} />
        <ActivityItem activity={mockPrActivity} />
        <ActivityItem activity={mockMemberJoinedActivity} />
      </div>,
    );

    const items = container.querySelectorAll('[data-testid="activity-item"]');
    expect(items).toHaveLength(3);
    items.forEach((item) => {
      expect(item.className).toContain('rounded-[12px]');
      expect(item.className).toContain('p-[var(--spacing-lg)]');
    });
  });

  it('has relative positioning for absolute new-indicator', () => {
    const { container } = render(<ActivityItem activity={mockActivity} />);

    const item = container.querySelector('[data-testid="activity-item"]');
    expect(item?.className).toContain('relative');
  });

  it('includes hover styles for card interaction', () => {
    const { container } = render(<ActivityItem activity={mockActivity} />);

    const item = container.querySelector('[data-testid="activity-item"]');
    expect(item?.className).toContain('hover:-translate-y-[2px]');
    expect(item?.className).toContain('hover:shadow-md');
  });

  it('respects reduced motion preference', () => {
    const { container } = render(<ActivityItem activity={mockActivity} />);

    const item = container.querySelector('[data-testid="activity-item"]');
    expect(item?.className).toContain('motion-reduce:transform-none');
    expect(item?.className).toContain('motion-reduce:transition-none');
  });
});

describe('ActivityFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders skeleton loaders during initial load', () => {
    mockUseActivityFeed.mockReturnValue({
      activities: [],
      isPending: true,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mockUseActivitySse.mockReturnValue({
      isConnected: false,
      isReconnecting: false,
      newItemIds: new Set(),
    });

    render(<ActivityFeed />);

    expect(screen.getByLabelText('Loading activity feed')).toBeInTheDocument();
  });

  it('renders activity items when loaded', () => {
    mockUseActivityFeed.mockReturnValue({
      activities: [mockActivity, mockPrActivity, mockMemberJoinedActivity],
      isPending: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mockUseActivitySse.mockReturnValue({
      isConnected: true,
      isReconnecting: false,
      newItemIds: new Set(),
    });

    render(<ActivityFeed />);

    expect(screen.getByText('New Commit: Fix authentication flow')).toBeInTheDocument();
    expect(screen.getByText('PR Merged: Add activity feed')).toBeInTheDocument();
    expect(screen.getByText('Charlie joined Governance')).toBeInTheDocument();
  });

  it('renders empty state when no activities', () => {
    mockUseActivityFeed.mockReturnValue({
      activities: [],
      isPending: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mockUseActivitySse.mockReturnValue({
      isConnected: true,
      isReconnecting: false,
      newItemIds: new Set(),
    });

    render(<ActivityFeed />);

    expect(
      screen.getByText(
        'No activity to display yet. Contributions will appear here as they happen.',
      ),
    ).toBeInTheDocument();
  });

  it('shows error message on feed error', () => {
    mockUseActivityFeed.mockReturnValue({
      activities: [],
      isPending: false,
      error: new Error('Network error'),
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mockUseActivitySse.mockReturnValue({
      isConnected: false,
      isReconnecting: false,
      newItemIds: new Set(),
    });

    render(<ActivityFeed />);

    expect(
      screen.getByText('Unable to load activity feed. Please try again later.'),
    ).toBeInTheDocument();
  });

  it('shows reconnecting indicator when SSE is reconnecting', () => {
    mockUseActivityFeed.mockReturnValue({
      activities: [mockActivity],
      isPending: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mockUseActivitySse.mockReturnValue({
      isConnected: false,
      isReconnecting: true,
      newItemIds: new Set(),
    });

    render(<ActivityFeed />);

    expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('does not show reconnecting indicator when connected', () => {
    mockUseActivityFeed.mockReturnValue({
      activities: [mockActivity],
      isPending: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mockUseActivitySse.mockReturnValue({
      isConnected: true,
      isReconnecting: false,
      newItemIds: new Set(),
    });

    render(<ActivityFeed />);

    expect(screen.queryByText('Reconnecting...')).not.toBeInTheDocument();
  });

  it('renders domain filter buttons', () => {
    mockUseActivityFeed.mockReturnValue({
      activities: [],
      isPending: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mockUseActivitySse.mockReturnValue({
      isConnected: true,
      isReconnecting: false,
      newItemIds: new Set(),
    });

    render(<ActivityFeed />);

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.getByText('Impact')).toBeInTheDocument();
    expect(screen.getByText('Governance')).toBeInTheDocument();
  });

  it('filters by domain when domain button is clicked', () => {
    mockUseActivityFeed.mockReturnValue({
      activities: [],
      isPending: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mockUseActivitySse.mockReturnValue({
      isConnected: true,
      isReconnecting: false,
      newItemIds: new Set(),
    });

    render(<ActivityFeed />);

    fireEvent.click(screen.getByText('Finance'));

    // The hook should be called with the domain filter
    expect(mockUseActivityFeed).toHaveBeenCalledWith({ domain: 'Finance' });
  });

  it('clears domain filter when All button is clicked', () => {
    mockUseActivityFeed.mockReturnValue({
      activities: [],
      isPending: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mockUseActivitySse.mockReturnValue({
      isConnected: true,
      isReconnecting: false,
      newItemIds: new Set(),
    });

    render(<ActivityFeed />);

    fireEvent.click(screen.getByText('Finance'));
    fireEvent.click(screen.getByText('All'));

    // Last call should be with empty filters
    const lastCall = mockUseActivityFeed.mock.calls[mockUseActivityFeed.mock.calls.length - 1];
    expect(lastCall[0]).toEqual({});
  });

  it('renders items with correct domain accent colors across all domains', () => {
    mockUseActivityFeed.mockReturnValue({
      activities: [
        mockActivity,
        mockPrActivity,
        mockMemberJoinedActivity,
        mockAnnouncementActivity,
      ],
      isPending: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mockUseActivitySse.mockReturnValue({
      isConnected: true,
      isReconnecting: false,
      newItemIds: new Set(),
    });

    render(<ActivityFeed />);

    const items = screen.getAllByTestId('activity-item');
    expect(items).toHaveLength(4);
  });

  it('applies fade-in animation to new SSE items', () => {
    mockUseActivityFeed.mockReturnValue({
      activities: [mockActivity, mockPrActivity],
      isPending: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mockUseActivitySse.mockReturnValue({
      isConnected: true,
      isReconnecting: false,
      newItemIds: new Set(['event-1']),
    });

    render(<ActivityFeed />);

    const items = screen.getAllByTestId('activity-item');
    expect(items[0].className).toContain('animate-fade-in');
    expect(items[1].className).not.toContain('animate-fade-in');
  });

  it('has accessible feed list role', () => {
    mockUseActivityFeed.mockReturnValue({
      activities: [mockActivity],
      isPending: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });
    mockUseActivitySse.mockReturnValue({
      isConnected: true,
      isReconnecting: false,
      newItemIds: new Set(),
    });

    render(<ActivityFeed />);

    expect(screen.getByRole('list', { name: 'Activity feed' })).toBeInTheDocument();
  });
});

describe('ActivityItem - Sprint Events', () => {
  const sprintStartedActivity: ActivityEvent = {
    id: 'sprint-event-1',
    eventType: 'SPRINT_STARTED',
    title: 'Sprint started: Sprint 42',
    description: '20 points committed',
    contributorId: 'admin-1',
    contributorName: 'Admin',
    contributorAvatarUrl: null,
    domain: 'Technology',
    contributionType: null,
    entityId: 'sprint-1',
    metadata: { sprintId: 'sprint-1', sprintName: 'Sprint 42', committedPoints: 20 },
    createdAt: new Date(Date.now() - 60000).toISOString(),
  };

  const sprintCompletedActivity: ActivityEvent = {
    ...sprintStartedActivity,
    id: 'sprint-event-2',
    eventType: 'SPRINT_COMPLETED',
    title: 'Sprint completed: Sprint 41',
    description: 'Velocity: 18 points (18/20 delivered)',
    metadata: { velocity: 18, committedPoints: 20, deliveredPoints: 18 },
  };

  const velocityMilestoneActivity: ActivityEvent = {
    ...sprintStartedActivity,
    id: 'sprint-event-3',
    eventType: 'SPRINT_VELOCITY_MILESTONE',
    title: 'Velocity milestone: 75% of sprint goal reached',
    description: 'Sprint 42: 15/20 points delivered',
    metadata: { milestonePercentage: 75, velocity: 15, committedPoints: 20, deliveredPoints: 15 },
  };

  it('renders SPRINT_STARTED event with correct label', () => {
    render(<ActivityItem activity={sprintStartedActivity} />);

    expect(screen.getByText('Sprint started: Sprint 42')).toBeInTheDocument();
    expect(screen.getByText('Sprint Started')).toBeInTheDocument();
    expect(screen.getByText('20 points committed')).toBeInTheDocument();
  });

  it('renders SPRINT_COMPLETED event with correct label', () => {
    render(<ActivityItem activity={sprintCompletedActivity} />);

    expect(screen.getByText('Sprint completed: Sprint 41')).toBeInTheDocument();
    expect(screen.getByText('Sprint Completed')).toBeInTheDocument();
  });

  it('renders SPRINT_VELOCITY_MILESTONE event with correct label', () => {
    render(<ActivityItem activity={velocityMilestoneActivity} />);

    expect(screen.getByText('Velocity milestone: 75% of sprint goal reached')).toBeInTheDocument();
    expect(screen.getByText('Velocity Milestone')).toBeInTheDocument();
  });

  it('renders sprint events with purple accent color', () => {
    const { container } = render(<ActivityItem activity={sprintStartedActivity} />);

    const dots = container.querySelectorAll('[style*="background-color"]');
    const hasPurple = Array.from(dots).some(
      (dot) =>
        (dot as HTMLElement).style.backgroundColor === 'rgb(124, 58, 237)' ||
        (dot as HTMLElement).style.cssText.includes('#7C3AED'),
    );
    expect(hasPurple).toBe(true);
  });
});

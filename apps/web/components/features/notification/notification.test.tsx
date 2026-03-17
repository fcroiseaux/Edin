import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationBadge } from './notification-badge';
import { NotificationToast } from './notification-toast';
import { NotificationInlineList } from './notification-inline-list';
import type { NotificationDto } from '@edin/shared';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockMarkRead = { mutate: vi.fn(), isPending: false };
vi.mock('../../../hooks/use-notifications', () => ({
  useNotifications: () => notificationsHookState,
  useUnreadCounts: () => ({ counts: {}, isPending: false, error: null }),
  useMarkNotificationRead: () => mockMarkRead,
  useMarkAllNotificationsRead: () => mockMarkAllRead,
}));

const mockMarkAllRead = { mutate: vi.fn(), isPending: false };

let notificationsHookState: {
  notifications: NotificationDto[];
  isPending: boolean;
  error: null;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
};

const mockNotification: NotificationDto = {
  id: 'n-1',
  contributorId: 'user-1',
  type: 'ANNOUNCEMENT_POSTED',
  title: 'New announcement in Technology',
  description: 'Welcome to the team! We are excited to have you.',
  entityId: 'ann-1',
  category: 'working-groups',
  read: false,
  createdAt: new Date(Date.now() - 300_000).toISOString(), // 5 minutes ago
  readAt: null,
};

const readNotification: NotificationDto = {
  ...mockNotification,
  id: 'n-2',
  read: true,
  readAt: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
  notificationsHookState = {
    notifications: [mockNotification, readNotification],
    isPending: false,
    error: null,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  };
});

describe('NotificationBadge', () => {
  it('renders warm dot when visible is true', () => {
    render(<NotificationBadge visible={true} />);

    const dot = screen.getByLabelText('New notifications');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass('bg-brand-accent');
    expect(dot).toHaveClass('h-[8px]');
    expect(dot).toHaveClass('w-[8px]');
    expect(dot).toHaveClass('rounded-full');
  });

  it('renders nothing when visible is false', () => {
    const { container } = render(<NotificationBadge visible={false} />);

    expect(container.firstChild).toBeNull();
  });

  it('uses custom aria label when provided', () => {
    render(<NotificationBadge visible={true} ariaLabel="3 new messages" />);

    expect(screen.getByLabelText('3 new messages')).toBeInTheDocument();
  });

  it('has pulse-once animation class', () => {
    render(<NotificationBadge visible={true} />);

    const dot = screen.getByLabelText('New notifications');
    expect(dot).toHaveClass('animate-pulse-once');
  });
});

describe('NotificationToast', () => {
  it('displays title, description, and relative timestamp', () => {
    render(<NotificationToast notification={mockNotification} />);

    expect(screen.getByText('New announcement in Technology')).toBeInTheDocument();
    expect(
      screen.getByText('Welcome to the team! We are excited to have you.'),
    ).toBeInTheDocument();
    expect(screen.getByText('5m ago')).toBeInTheDocument();
  });

  it('truncates description over 100 characters', () => {
    const longNotification = {
      ...mockNotification,
      description: 'A'.repeat(150),
    };
    render(<NotificationToast notification={longNotification} />);

    expect(screen.getByText('A'.repeat(100) + '...')).toBeInTheDocument();
  });

  it('handles null description', () => {
    const noDescNotification = {
      ...mockNotification,
      description: null,
    };
    render(<NotificationToast notification={noDescNotification} />);

    expect(screen.getByText('New announcement in Technology')).toBeInTheDocument();
  });

  it('marks as read and navigates on click', () => {
    render(<NotificationToast notification={mockNotification} />);

    fireEvent.click(screen.getByRole('button'));

    expect(mockMarkRead.mutate).toHaveBeenCalledWith({
      notificationId: 'n-1',
      category: 'working-groups',
    });
    expect(mockPush).toHaveBeenCalledWith('/dashboard/working-groups');
  });

  it('does not mark already-read notification again', () => {
    render(<NotificationToast notification={readNotification} />);

    fireEvent.click(screen.getByRole('button'));

    expect(mockMarkRead.mutate).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalled();
  });

  it('applies highlight animation for unread notifications', () => {
    render(<NotificationToast notification={mockNotification} />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('animate-highlight-fade');
  });

  it('does not apply highlight animation for read notifications', () => {
    render(<NotificationToast notification={readNotification} />);

    const button = screen.getByRole('button');
    expect(button).not.toHaveClass('animate-highlight-fade');
  });

  it('routes to /admin/sprints for sprints category notifications', () => {
    const sprintNotification: NotificationDto = {
      ...mockNotification,
      id: 'n-sprint',
      type: 'SPRINT_DEADLINE_APPROACHING',
      title: 'Sprint deadline approaching: Sprint 43',
      description: '24h remaining — 15/20 points delivered',
      category: 'sprints',
    };

    render(<NotificationToast notification={sprintNotification} />);

    fireEvent.click(screen.getByRole('button'));

    expect(mockPush).toHaveBeenCalledWith('/admin/sprints');
  });
});

describe('NotificationInlineList', () => {
  it('shows unread notifications filtered by category', () => {
    render(<NotificationInlineList category="working-groups" />);

    expect(screen.getByText('New announcement in Technology')).toBeInTheDocument();
    expect(screen.getByText('New updates')).toBeInTheDocument();
  });

  it('renders nothing when no unread notifications', () => {
    notificationsHookState.notifications = [readNotification];
    const { container } = render(<NotificationInlineList category="working-groups" />);

    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when loading', () => {
    notificationsHookState.isPending = true;
    const { container } = render(<NotificationInlineList category="working-groups" />);

    expect(container.firstChild).toBeNull();
  });

  it('dismiss all clears notifications for category', () => {
    render(<NotificationInlineList category="working-groups" />);

    fireEvent.click(screen.getByText('Dismiss all'));

    expect(mockMarkAllRead.mutate).toHaveBeenCalledWith('working-groups');
  });

  it('shows maximum 5 unread notifications', () => {
    notificationsHookState.notifications = Array.from({ length: 8 }, (_, i) => ({
      ...mockNotification,
      id: `n-${i}`,
      title: `Notification ${i}`,
    }));

    render(<NotificationInlineList category="working-groups" />);

    const buttons = screen.getAllByRole('button');
    // 5 notification toasts + 1 dismiss all button
    expect(buttons).toHaveLength(6);
  });

  it('has aria-live for accessibility', () => {
    render(<NotificationInlineList category="working-groups" />);

    const container = screen.getByText('New updates').closest('[aria-live]');
    expect(container).toHaveAttribute('aria-live', 'polite');
  });
});

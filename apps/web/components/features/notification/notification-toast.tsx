'use client';

import { useRouter } from 'next/navigation';
import { useMarkNotificationRead } from '../../../hooks/use-notifications';
import type { NotificationDto } from '@edin/shared';

interface NotificationToastProps {
  notification: NotificationDto;
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function NotificationToast({ notification }: NotificationToastProps) {
  const router = useRouter();
  const markRead = useMarkNotificationRead();

  const description =
    notification.description && notification.description.length > 100
      ? notification.description.slice(0, 100) + '...'
      : notification.description;

  function handleClick() {
    if (!notification.read) {
      markRead.mutate({
        notificationId: notification.id,
        category: notification.category,
      });
    }
    const route =
      notification.category === 'sprints'
        ? '/admin/sprints'
        : `/dashboard/${notification.category}`;
    router.push(route);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full rounded-[var(--radius-md)] px-[var(--spacing-md)] py-[var(--spacing-sm)] text-left transition-colors duration-[var(--transition-fast)] hover:bg-surface-sunken ${
        !notification.read ? 'animate-highlight-fade' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-[var(--spacing-sm)]">
        <p className="font-sans text-[15px] font-medium text-brand-primary">{notification.title}</p>
        <time className="shrink-0 font-sans text-[13px] text-brand-secondary">
          {formatRelativeTime(notification.createdAt)}
        </time>
      </div>
      {description && (
        <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-brand-secondary">
          {description}
        </p>
      )}
    </button>
  );
}

export type NotificationType =
  | 'EVALUATION_COMPLETED'
  | 'PEER_FEEDBACK_AVAILABLE'
  | 'ANNOUNCEMENT_POSTED'
  | 'CONTRIBUTION_TO_DOMAIN'
  | 'TASK_ASSIGNED'
  | 'ARTICLE_FEEDBACK'
  | 'ARTICLE_PUBLISHED'
  | 'SPRINT_DEADLINE_APPROACHING'
  | 'SPRINT_VELOCITY_DROP'
  | 'SPRINT_SCOPE_CHANGED'
  | 'PRIZE_AWARDED'
  | 'PEER_NOMINATION_RECEIVED'
  | 'TRACK_RECORD_MILESTONE';

export type NotificationCategory =
  | 'evaluations'
  | 'feedback'
  | 'working-groups'
  | 'tasks'
  | 'publications'
  | 'sprints'
  | 'prizes'
  | 'track-record';

export interface NotificationDto {
  id: string;
  contributorId: string;
  type: NotificationType;
  title: string;
  description: string | null;
  entityId: string;
  category: NotificationCategory;
  read: boolean;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationListResponse {
  data: NotificationDto[];
  meta: {
    timestamp: string;
    correlationId: string;
    pagination: {
      cursor: string | null;
      hasMore: boolean;
      total: number;
    };
  };
}

export interface UnreadCountResponse {
  data: Record<string, number>;
  meta: {
    timestamp: string;
    correlationId: string;
  };
}

export interface NotificationSseEvent {
  type: 'notification.new';
  notification: NotificationDto;
}

import type { ContributionType } from './ingestion.types.js';

export type ActivityEventType =
  | 'CONTRIBUTION_NEW'
  | 'EVALUATION_COMPLETED'
  | 'ANNOUNCEMENT_CREATED'
  | 'MEMBER_JOINED'
  | 'TASK_COMPLETED'
  | 'FEEDBACK_ASSIGNED'
  | 'FEEDBACK_SUBMITTED'
  | 'FEEDBACK_REASSIGNED'
  | 'SPRINT_STARTED'
  | 'SPRINT_COMPLETED'
  | 'SPRINT_VELOCITY_MILESTONE';

export interface ActivityEvent {
  id: string;
  eventType: ActivityEventType;
  title: string;
  description: string | null;
  contributorId: string;
  contributorName?: string;
  contributorAvatarUrl?: string | null;
  domain: string;
  contributionType: ContributionType | null;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ActivityFeedQuery {
  cursor?: string;
  limit: number;
  domain?: string;
}

export interface ActivityFeedResponse {
  data: ActivityEvent[];
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

export interface ActivitySseEvent {
  type: 'activity.new';
  activity: ActivityEvent;
}

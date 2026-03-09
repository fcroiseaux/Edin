export type FeedbackStatus = 'ASSIGNED' | 'COMPLETED' | 'REASSIGNED' | 'UNASSIGNED';

export interface PeerFeedbackDto {
  id: string;
  contributionId: string;
  reviewerId: string;
  status: FeedbackStatus;
  ratings: unknown | null;
  comments: string | null;
  assignedBy: string | null;
  assignedAt: string;
  submittedAt: string | null;
  reassignedAt: string | null;
  reassignReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackListResponse {
  data: PeerFeedbackDto[];
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

export interface FeedbackAssignmentEvent {
  eventType: 'feedback.review.assigned';
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    peerFeedbackId: string;
    contributionId: string;
    reviewerId: string;
    contributionTitle: string;
    contributionType: string;
    domain: string;
  };
}

export interface RubricResponse {
  questionId: string;
  rating: number;
  comment: string;
}

export interface FeedbackSubmissionDto {
  responses: RubricResponse[];
  overallComment?: string;
}

export interface RubricData {
  rubricVersion: string;
  responses: RubricResponse[];
}

export interface FeedbackDetailDto extends PeerFeedbackDto {
  contribution: {
    id: string;
    title: string;
    description: string | null;
    contributionType: string;
  };
  reviewer: {
    id: string;
    name: string;
    avatarUrl: string | null;
    domain: string | null;
  };
}

export interface FeedbackSubmittedEvent {
  eventType: 'feedback.review.submitted';
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    peerFeedbackId: string;
    contributionId: string;
    reviewerId: string;
    contributorId: string;
    contributionTitle: string;
    contributionType: string;
    domain: string;
  };
}

export interface ReceivedFeedbackDto {
  id: string;
  contributionId: string;
  reviewerId: string;
  status: FeedbackStatus;
  ratings: RubricData | null;
  comments: string | null;
  submittedAt: string | null;
  contribution: {
    id: string;
    title: string;
    contributionType: string;
  };
  reviewer: {
    id: string;
    name: string;
    avatarUrl: string | null;
    domain: string | null;
  };
}

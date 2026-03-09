export type RepositoryStatus = 'ACTIVE' | 'PENDING' | 'ERROR' | 'REMOVING';

export interface MonitoredRepository {
  id: string;
  owner: string;
  repo: string;
  fullName: string;
  webhookId: number | null;
  status: RepositoryStatus;
  statusMessage: string | null;
  addedById: string;
  addedByName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AddRepositoryInput {
  owner: string;
  repo: string;
}

export interface ListRepositoriesQuery {
  cursor?: string;
  limit: number;
}

export type WebhookEventType = 'push' | 'pull_request' | 'pull_request_review';

export interface WebhookEvent {
  eventType: WebhookEventType;
  repositoryFullName: string;
  payload: Record<string, unknown>;
  deliveryId: string;
}

// Contribution types

export type ContributionSource = 'GITHUB';

export type ContributionType = 'COMMIT' | 'PULL_REQUEST' | 'CODE_REVIEW';

export type ContributionStatus = 'INGESTED' | 'ATTRIBUTED' | 'UNATTRIBUTED' | 'EVALUATED';

export type WebhookDeliveryStatus = 'RECEIVED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface Contribution {
  id: string;
  contributorId: string | null;
  taskId: string | null;
  repositoryId: string;
  source: ContributionSource;
  sourceRef: string;
  contributionType: ContributionType;
  title: string;
  description: string | null;
  rawData: Record<string, unknown>;
  normalizedAt: string;
  status: ContributionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  deliveryId: string;
  repositoryId: string;
  eventType: string;
  status: WebhookDeliveryStatus;
  payload: Record<string, unknown> | null;
  processedAt: string | null;
  createdAt: string;
}

export interface ContributionIngestedEvent {
  contributionId: string;
  contributionType: ContributionType;
  contributorId: string | null;
  repositoryId: string;
  correlationId: string;
}

export interface ContributionListQuery {
  cursor?: string;
  limit: number;
  type?: ContributionType;
}

export interface ContributionWithRepository extends Contribution {
  repositoryName: string;
}

export interface ContributionAttributedEvent {
  contributionId: string;
  contributionType: ContributionType;
  contributorId: string;
  repositoryId: string;
  correlationId: string;
}

export interface ContributionSseEvent {
  type:
    | 'contribution.new'
    | 'contribution.collaboration.detected'
    | 'contribution.collaboration.confirmed'
    | 'contribution.attribution.overridden';
  contributionId: string;
  contributionType: ContributionType;
}

// Collaboration types (Story 4-4)

export type CollaborationRole = 'PRIMARY_AUTHOR' | 'CO_AUTHOR' | 'COMMITTER' | 'ISSUE_ASSIGNEE';

export type CollaborationStatus = 'DETECTED' | 'CONFIRMED' | 'DISPUTED' | 'OVERRIDDEN';

export interface ContributionCollaboration {
  id: string;
  contributionId: string;
  contributorId: string;
  contributorName: string;
  contributorAvatarUrl: string | null;
  role: CollaborationRole;
  splitPercentage: number;
  status: CollaborationStatus;
  detectionSource: string;
  confirmedAt: string | null;
}

export interface ContributionWithCollaborations extends ContributionWithRepository {
  collaborations: ContributionCollaboration[];
}

export interface CollaborationDetectedEvent {
  contributionId: string;
  collaborators: Array<{ contributorId: string; role: CollaborationRole }>;
  correlationId: string;
}

export interface CollaborationConfirmedEvent {
  collaborationId: string;
  contributionId: string;
  contributorId: string;
  correlationId: string;
}

export interface CollaborationDisputedEvent {
  collaborationId: string;
  contributionId: string;
  contributorId: string;
  comment: string;
  correlationId: string;
}

export interface AttributionOverriddenEvent {
  contributionId: string;
  overriddenById: string;
  attributions: Array<{ contributorId: string; splitPercentage: number }>;
  correlationId: string;
}

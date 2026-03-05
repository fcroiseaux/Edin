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

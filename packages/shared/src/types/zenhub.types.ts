export interface ZenhubConfigResponse {
  apiTokenConfigured: boolean;
  apiTokenHint: string | null;
  webhookUrl: string | null;
  webhookSecretConfigured: boolean;
  pollingIntervalMs: number;
  workspaceMapping: Record<string, string> | null;
}

export interface UpdateZenhubConfigInput {
  apiToken?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  pollingIntervalMs?: number;
  workspaceMapping?: Record<string, string>;
}

export interface ZenhubConfigUpdatedEvent {
  eventType: 'zenhub.config.updated';
  timestamp: string;
  correlationId?: string;
  actorId: string;
  payload: {
    updatedKeys: string[];
  };
}

export interface ZenhubWebhookEvent {
  type: string;
  organization?: string;
  repo?: string;
  workspace_id?: string;
  [key: string]: unknown;
}

export interface ZenhubWebhookReceivedEvent {
  eventType: 'zenhub.webhook.received';
  timestamp: string;
  correlationId: string;
  payload: {
    syncId: string;
    webhookEventType: string;
    deliveryId: string;
  };
}

export interface ZenhubPollCompletedEvent {
  eventType: 'zenhub.poll.completed';
  timestamp: string;
  correlationId: string;
  payload: {
    syncId: string;
    sprintCount: number;
    issueCount: number;
    durationMs: number;
  };
}

export interface ZenhubPollFailedEvent {
  eventType: 'zenhub.poll.failed';
  timestamp: string;
  correlationId: string;
  payload: {
    syncId: string;
    errorMessage: string;
    errorCode: string;
  };
}

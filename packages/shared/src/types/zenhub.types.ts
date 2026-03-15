export interface ZenhubConfigResponse {
  apiTokenConfigured: boolean;
  apiTokenHint: string | null;
  webhookUrl: string | null;
  webhookSecretConfigured: boolean;
  pollingIntervalMs: number;
  workspaceMapping: Record<string, string> | null;
  taskSyncEnabled: boolean;
  contributorTaskLabel: string | null;
  taskSyncCreatorId: string | null;
  statusSyncEnabled: boolean;
  pipelineStatusMapping: Record<string, string> | null;
}

export interface UpdateZenhubConfigInput {
  apiToken?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  pollingIntervalMs?: number;
  workspaceMapping?: Record<string, string>;
  taskSyncEnabled?: boolean;
  contributorTaskLabel?: string;
  taskSyncCreatorId?: string;
  statusSyncEnabled?: boolean;
  pipelineStatusMapping?: Record<string, string>;
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

export type ZenhubSyncType = 'WEBHOOK' | 'POLL' | 'BACKFILL';
export type ZenhubSyncStatus = 'RECEIVED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface ZenhubSyncLogEntry {
  id: string;
  deliveryId: string;
  syncType: ZenhubSyncType;
  status: ZenhubSyncStatus;
  eventType: string;
  correlationId: string | null;
  errorMessage: string | null;
  retryCount: number;
  receivedAt: string;
  processedAt: string | null;
  payloadSummary: string | null;
  durationMs: number | null;
  recordsSynced: number | null;
}

export interface ZenhubAlertConfig {
  webhookFailureThreshold: number;
  pollingTimeoutMinutes: number;
  enabled: boolean;
}

export type ZenhubSyncConflictResolution = 'auto-resolved' | 'pending' | 'manual-resolved';

export interface ZenhubSyncConflictEntry {
  id: string;
  syncId: string | null;
  conflictType: string;
  affectedEntity: string;
  affectedEntityId: string;
  resolution: ZenhubSyncConflictResolution;
  outcome: string | null;
  occurredAt: string;
  resolvedBy: string | null;
}

export type IntegrationOverallStatus = 'healthy' | 'degraded' | 'down';

export interface IntegrationHealthSummary {
  lastSuccessfulPoll: string | null;
  lastSuccessfulWebhook: string | null;
  webhookSuccessRate: number;
  webhookTotalLast24h: number;
  webhookFailedLast24h: number;
  pollingAvgDurationMs: number | null;
  overallStatus: IntegrationOverallStatus;
}

export interface ZenhubTaskCreatedEvent {
  eventType: 'zenhub.task.created';
  timestamp: string;
  correlationId: string;
  payload: {
    taskId: string;
    zenhubIssueId: string;
    issueNumber: number;
    title: string;
    domain: string;
  };
}

export interface ZenhubIssueData {
  id: string;
  number: number;
  title: string;
  body?: string;
  estimate?: { value: number } | null;
  pipelineIssue?: { pipeline: { id: string; name: string } } | null;
  sprints?: { nodes: Array<{ id: string; name: string }> };
  labels?: { nodes: Array<{ name: string }> };
  assignees?: { nodes: Array<{ login: string }> };
}

export interface ZenhubTaskStatusSyncedEvent {
  eventType: 'zenhub.task.status.synced';
  timestamp: string;
  correlationId: string;
  payload: {
    taskId: string;
    zenhubIssueId: string;
    previousStatus: string;
    newStatus: string;
    pipelineName: string;
  };
}

export interface ZenhubTaskPointsSyncedEvent {
  eventType: 'zenhub.task.points.synced';
  timestamp: string;
  correlationId: string;
  payload: {
    taskId: string;
    zenhubIssueId: string;
    previousEstimate: string;
    newEstimate: string;
    storyPoints: number | null;
  };
}

export interface ZenhubSyncConflictDetail {
  edinStatus: string;
  zenhubPipeline: string;
  zenhubMappedStatus: string | null;
  appliedStatus: string | null;
  taskId: string;
  zenhubIssueId: string;
}

export interface ResolveZenhubSyncConflictInput {
  action: 'keep-edin' | 'apply-status';
  applyStatus?: string;
}

export interface ZenhubSyncConflictResolvedEvent {
  eventType: 'sprint.sync.conflict.resolved';
  timestamp: string;
  correlationId: string;
  payload: {
    conflictId: string;
    resolution: 'manual-resolved';
    action: string;
    appliedStatus: string | null;
    taskId: string;
    adminId: string;
  };
}

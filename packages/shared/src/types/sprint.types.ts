export interface BurndownDataPoint {
  date: string; // ISO date (YYYY-MM-DD)
  remainingPoints: number;
  idealPoints: number;
}

export interface SprintMetricCalculatedEvent {
  eventType:
    | 'sprint.velocity.calculated'
    | 'sprint.burndown.calculated'
    | 'sprint.metrics.recalculated';
  timestamp: string;
  correlationId: string;
  payload: {
    sprintId: string;
    sprintName: string;
    metricType: 'velocity' | 'burndown' | 'cycle_time' | 'lead_time' | 'all';
    value: number | BurndownDataPoint[] | null;
    domain?: string;
  };
}

export type ScopeChangeType = 'ADDED' | 'REMOVED';

export interface ScopeChangeEvent {
  eventType: 'sprint.scope.changed';
  timestamp: string;
  correlationId: string;
  payload: {
    sprintId: string;
    issueId: string;
    changeType: ScopeChangeType;
    storyPoints: number | null;
  };
}

export interface ContributorEstimationData {
  contributorId: string;
  plannedPoints: number;
  deliveredPoints: number;
  accuracy: number | null; // percentage
}

export interface VelocityDataPoint {
  x: string; // sprintEnd ISO date
  y: number; // velocity (delivered points)
  label: string; // sprint name
}

export interface SprintMetricDetail {
  id: string;
  sprintId: string;
  sprintName: string;
  sprintStart: string;
  sprintEnd: string;
  velocity: number;
  committedPoints: number;
  deliveredPoints: number;
  cycleTimeAvg: number | null;
  leadTimeAvg: number | null;
  scopeChanges: number;
  estimationAccuracy: number | null;
}

export interface SprintMetricSummary {
  id: string;
  sprintId: string;
  sprintName: string;
  sprintStart: string;
  sprintEnd: string;
  velocity: number;
  committedPoints: number;
  deliveredPoints: number;
}

export interface ScopeChangeRecord {
  id: string;
  issueId: string;
  issueNumber: number;
  changeType: ScopeChangeType;
  storyPoints: number | null;
  changedAt: string; // ISO string
}

export interface ContributorAccuracyTrend {
  contributorId: string;
  sprints: Array<{
    sprintId: string;
    sprintName: string;
    sprintEnd: string;
    plannedPoints: number;
    deliveredPoints: number;
    accuracy: number | null;
  }>;
}

export interface CombinedContributorMetric {
  contributorId: string;
  contributorName: string | null;
  githubUsername: string | null;
  sprintCount: number;
  totalPlannedPoints: number;
  totalDeliveredPoints: number;
  averageAccuracy: number | null;
  evaluationCount: number;
  averageEvaluationScore: number | null;
}

export type SprintExportFormat = 'csv' | 'pdf';

export interface ContributionEnrichedEvent {
  eventType: 'sprint.contribution.enriched';
  timestamp: string;
  correlationId: string;
  payload: {
    contributionId: string;
    sprintId: string;
    zenhubIssueId: string;
    storyPoints: number | null;
    epicId: string | null;
    pipelineStatus: string | null;
  };
}

export interface ContributionSprintContextDto {
  id: string;
  contributionId: string;
  sprintId: string;
  storyPoints: number | null;
  zenhubIssueId: string;
  epicId: string | null;
  pipelineStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EstimationAccuracyCalculatedEvent {
  eventType: 'sprint.estimation.calculated';
  timestamp: string;
  correlationId: string;
  payload: {
    sprintId: string;
    sprintName: string;
    overallAccuracy: number | null;
    contributorCount: number;
    domain?: string;
  };
}

export interface PlanningReliabilityDto {
  id: string;
  contributorId: string;
  sprintId: string;
  committedPoints: number;
  deliveredPoints: number;
  deliveryRatio: number | null;
  estimationVariance: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContributorPlanningReliabilitySummary {
  contributorId: string;
  contributorName: string | null;
  githubUsername: string | null;
  domain: string | null;
  sprintCount: number;
  averageDeliveryRatio: number | null;
  averageEstimationVariance: number | null;
  trend: Array<{
    sprintId: string;
    sprintName: string;
    sprintEnd: string;
    deliveryRatio: number | null;
    estimationVariance: number | null;
  }>;
}

export interface CrossDomainCollaborationDto {
  id: string;
  sprintId: string;
  epicId: string | null;
  domains: string[];
  contributorIds: string[];
  collaborationType: string;
  detectedAt: string;
}

export interface CrossDomainCollaborationSummary {
  totalCollaborations: number;
  domainPairs: Array<{
    domains: string[];
    count: number;
  }>;
  recentCollaborations: CrossDomainCollaborationDto[];
}

export interface PlanningReliabilityCalculatedEvent {
  eventType: 'sprint.planning.reliability.calculated';
  timestamp: string;
  correlationId: string;
  payload: {
    sprintId: string;
    contributorCount: number;
    averageDeliveryRatio: number | null;
  };
}

export interface CrossDomainCollaborationDetectedEvent {
  eventType: 'sprint.collaboration.detected';
  timestamp: string;
  correlationId: string;
  payload: {
    sprintId: string;
    epicId: string | null;
    domains: string[];
    contributorCount: number;
  };
}

export interface SprintActivityPayload {
  eventType:
    | 'sprint.lifecycle.started'
    | 'sprint.lifecycle.completed'
    | 'sprint.velocity.milestone';
  timestamp: string;
  correlationId: string;
  payload: {
    sprintId: string;
    sprintName: string;
    velocity?: number;
    committedPoints?: number;
    deliveredPoints?: number;
    milestonePercentage?: number;
  };
}

export interface SprintNotificationEvent {
  eventType:
    | 'sprint.notification.deadline'
    | 'sprint.notification.velocity_drop'
    | 'sprint.notification.scope_changed';
  timestamp: string;
  correlationId: string;
  payload: {
    sprintId: string;
    sprintName: string;
    hoursRemaining?: number;
    committedPoints?: number;
    deliveredPoints?: number;
    deliveryPercentage?: number;
    changeType?: 'ADDED' | 'REMOVED';
    storyPoints?: number | null;
    issueId?: string;
  };
}

export interface PersonalSprintMetrics {
  contributorId: string;
  contributorName: string | null;
  domain: string | null;
  velocity: Array<{
    sprintId: string;
    sprintName: string;
    sprintEnd: string;
    deliveredPoints: number;
  }>;
  estimationAccuracy: Array<{
    sprintId: string;
    sprintName: string;
    sprintEnd: string;
    plannedPoints: number;
    deliveredPoints: number;
    accuracy: number | null;
  }>;
  planningReliability: {
    averageDeliveryRatio: number | null;
    averageEstimationVariance: number | null;
    trend: Array<{
      sprintId: string;
      sprintName: string;
      sprintEnd: string;
      deliveryRatio: number | null;
      estimationVariance: number | null;
    }>;
  };
  summary: {
    totalSprints: number;
    totalDeliveredPoints: number;
    averageVelocity: number | null;
    averageAccuracy: number | null;
  };
}

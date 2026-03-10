/**
 * Admin health metrics dashboard types.
 */

export interface DomainDistributionMetric {
  domain: string;
  count: number;
  percentage: number;
}

export interface RetentionCohort {
  period: string;
  joined: number;
  retained: number;
  rate: number;
}

export interface MetricTrendPoint {
  date: string;
  value: number;
}

export interface MetricCard {
  label: string;
  value: number;
  unit: string;
  target: number | null;
  trend: MetricTrendPoint[];
  editorialContext: string;
}

export interface CommunityVitals {
  activeContributors: MetricCard;
  retentionRate: MetricCard;
  domainDistribution: DomainDistributionMetric[];
  feedbackTurnaroundHours: MetricCard;
  contributionFrequency: MetricCard;
  evaluationCompletionRate: MetricCard;
  publicationRate: MetricCard;
  avgEvaluationScore: MetricCard;
}

export interface KpiMetric {
  id: string;
  label: string;
  category: 'leading' | 'lagging';
  value: number | null;
  target: number | null;
  unit: string;
  frequency: string;
  editorialContext: string;
}

export interface HealthMetrics {
  vitals: CommunityVitals;
  leadingKpis: KpiMetric[];
  laggingKpis: KpiMetric[];
  generatedAt: string;
}

// System alerts

export type AlertType =
  | 'API_ERROR_RATE'
  | 'INGESTION_FAILURE'
  | 'EVALUATION_THROUGHPUT'
  | 'DB_LATENCY';

export type AlertSeverity = 'WARNING' | 'CRITICAL';

export interface SystemAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  threshold: number;
  currentValue: number;
  message: string;
  occurredAt: string;
  dismissed: boolean;
}

// Reports

export type ReportFormat = 'csv' | 'json';

export type ReportStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ReportConfig {
  startDate: string;
  endDate: string;
  kpiIds: string[];
  format: ReportFormat;
}

export interface GeneratedReport {
  id: string;
  config: ReportConfig;
  status: ReportStatus;
  createdAt: string;
  completedAt: string | null;
  downloadUrl: string | null;
  createdBy: string;
}

// Contributor management

export interface ContributorListItem {
  id: string;
  name: string;
  email: string | null;
  role: string;
  domain: string | null;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface ContributorListFilters {
  search?: string;
  role?: string;
  domain?: string;
  cursor?: string;
  limit?: number;
}

export interface ContributorListResponse {
  data: ContributorListItem[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

// Platform settings

export type SettingsSectionKey = 'github' | 'feedback' | 'onboarding';

export interface PlatformSettingsSection {
  section: SettingsSectionKey;
  label: string;
  settings: Record<string, unknown>;
  updatedAt: string | null;
}

export interface PlatformSettingsResponse {
  sections: PlatformSettingsSection[];
}

// Audit logs

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  previousState: unknown | null;
  newState: unknown | null;
  reason: string | null;
  details: unknown | null;
  correlationId: string | null;
  createdAt: string;
}

export interface AuditLogFilters {
  eventType?: string;
  actorId?: string;
  targetId?: string;
  startDate?: string;
  endDate?: string;
  correlationId?: string;
  cursor?: string;
  limit?: number;
}

export interface AuditLogListResponse {
  data: AuditLogEntry[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

export const AUDIT_EVENT_TYPES = [
  'auth.account.created',
  'PROFILE_UPDATED',
  'ROLE_CHANGED',
  'FOUNDING_STATUS_DESIGNATED',
  'admission.application.submitted',
  'admission.application.approved',
  'admission.application.rejected',
  'admission.application.info.requested',
  'admission.reviewer.assigned',
  'admission.buddy.assignment.skipped',
  'admission.buddy.notification.pending',
  'evaluation.completed',
  'evaluation.overridden',
  'evaluation.flagged',
  'evaluation.review.resolved',
  'article.published',
  'article.unpublished',
  'article.flagged',
  'article.flag.resolved',
  'moderation.action',
  'SETTING_UPDATED',
  'working-group.joined',
  'working-group.left',
  'working-group.lead.assigned',
  'contribution.ingested',
  'collaboration.attribution.overridden',
  'feedback.assigned',
  'feedback.submitted',
  'feedback.reassigned',
  'scoring.formula.updated',
  'data.export.requested',
  'data.export.completed',
  'data.deletion.requested',
  'data.deletion.confirmed',
  'data.deletion.completed',
  'data.deletion.cancelled',
  'compliance.document.generated',
  'compliance.document.reviewed',
] as const;

export type AuditEventType = (typeof AUDIT_EVENT_TYPES)[number];

// Domain events

export interface RoleChangeEvent {
  eventType: 'contributor.role.changed';
  timestamp: string;
  correlationId?: string;
  actorId: string;
  payload: {
    contributorId: string;
    oldRole: string;
    newRole: string;
    reason: string;
  };
}

export interface SettingsUpdatedEvent {
  eventType: 'platform.settings.updated';
  timestamp: string;
  correlationId?: string;
  actorId: string;
  payload: {
    section: SettingsSectionKey;
    updatedKeys: string[];
  };
}

// GDPR Data Export

export type DataExportRequestStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'EXPIRED' | 'FAILED';

export interface DataExportRequestDto {
  id: string;
  contributorId: string;
  status: DataExportRequestStatus;
  requestedAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  downloadUrl: string | null;
  fileName: string | null;
}

// GDPR Data Deletion

export type DataDeletionRequestStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface DataDeletionRequestDto {
  id: string;
  contributorId: string;
  status: DataDeletionRequestStatus;
  requestedAt: string;
  coolingOffEndsAt: string;
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  daysRemaining: number | null;
}

// EU AI Act Compliance Documents

export type ComplianceDocumentTypeValue =
  | 'MODEL_CARD'
  | 'EVALUATION_CRITERIA'
  | 'HUMAN_OVERSIGHT_REPORT'
  | 'DATA_PROCESSING_RECORD';

export interface ComplianceDocumentDto {
  id: string;
  documentType: ComplianceDocumentTypeValue;
  version: number;
  format: string;
  generatedAt: string;
  legalReviewedAt: string | null;
  legalReviewedBy: string | null;
  reviewNotes: string | null;
  retiredAt: string | null;
  relatedModelId: string | null;
}

export interface ComplianceDocumentDetailDto extends ComplianceDocumentDto {
  content: unknown;
}

export interface ComplianceDocumentListResponse {
  data: ComplianceDocumentDto[];
  pagination: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

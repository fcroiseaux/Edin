export const ARTICLE_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'EDITORIAL_REVIEW',
  'REVISION_REQUESTED',
  'APPROVED',
  'PUBLISHED',
  'ARCHIVED',
] as const;

export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export interface ArticleDto {
  id: string;
  title: string;
  slug: string;
  abstract: string;
  body: string;
  domain: string;
  status: ArticleStatus;
  version: number;
  authorId: string;
  editorId: string | null;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  publishedAt: string | null;
}

export interface ArticleListItemDto {
  id: string;
  title: string;
  slug: string;
  abstract: string;
  domain: string;
  status: ArticleStatus;
  version: number;
  updatedAt: string;
}

export interface ArticleSubmittedEvent {
  articleId: string;
  authorId: string;
  domain: string;
  title: string;
  timestamp: string;
  correlationId: string;
}

// ─── File Import Types ──────────────────────────────────────────────────────

export interface FileImportResultDto {
  title: string;
  abstract: string;
  body: string; // Tiptap JSON string
}

// ─── Editorial Types ────────────────────────────────────────────────────────

export const EDITORIAL_DECISIONS = ['APPROVE', 'REQUEST_REVISIONS', 'REJECT'] as const;
export type EditorialDecision = (typeof EDITORIAL_DECISIONS)[number];

export interface RevisionRequestItem {
  id: string;
  description: string;
  resolved: boolean;
}

export interface InlineCommentDto {
  id: string;
  content: string;
  highlightStart: number;
  highlightEnd: number;
  articleVersion: number;
  resolved: boolean;
  createdAt: string;
}

export interface EditorialFeedbackDto {
  id: string;
  articleId: string;
  editorId: string;
  decision: EditorialDecision;
  overallAssessment: string;
  revisionRequests: RevisionRequestItem[];
  inlineComments: InlineCommentDto[];
  articleVersion: number;
  createdAt: string;
}

export interface ArticleVersionDto {
  versionNumber: number;
  body?: string;
  createdAt: string;
}

export interface EditorialViewDto {
  article: ArticleDto;
  feedbackHistory: EditorialFeedbackDto[];
  versions: ArticleVersionDto[];
}

export interface EditorProfileDto {
  id: string;
  displayName: string;
  profileImageUrl: string | null;
}

export interface AuthorRevisionViewDto {
  article: ArticleDto;
  latestFeedback: EditorialFeedbackDto | null;
  feedbackHistory: EditorialFeedbackDto[];
  editorProfile: EditorProfileDto | null;
}

export interface EditorAssignedEvent {
  articleId: string;
  authorId: string;
  editorId: string;
  domain: string;
  title: string;
  timestamp: string;
  correlationId: string;
}

export interface ArticleRevisionRequestedEvent {
  articleId: string;
  authorId: string;
  editorId: string;
  domain: string;
  title: string;
  timestamp: string;
  correlationId: string;
}

export interface ArticleApprovedEvent {
  articleId: string;
  authorId: string;
  editorId: string;
  domain: string;
  title: string;
  timestamp: string;
  correlationId: string;
}

export interface ArticlePublishedEvent {
  articleId: string;
  authorId: string;
  editorId: string;
  domain: string;
  title: string;
  timestamp: string;
  correlationId: string;
}

// ─── Public Article Types ────────────────────────────────────────────────────

export interface PublicArticleAuthorDto {
  id: string;
  name: string;
  avatarUrl: string | null;
  domain: string | null;
  bio: string | null;
}

export interface PublicArticleEditorDto {
  id: string;
  name: string;
  avatarUrl: string | null;
  domain: string | null;
}

export interface PublicArticleListItemDto {
  id: string;
  title: string;
  slug: string;
  abstract: string;
  domain: string;
  publishedAt: string;
  readingTimeMinutes: number;
  author: PublicArticleAuthorDto;
}

export interface PublicArticleDetailDto extends PublicArticleListItemDto {
  body: string;
  editor: PublicArticleEditorDto | null;
  evaluationScore: number | null;
  evaluationNarrative: string | null;
}

export interface ArticleFilterParams {
  domain?: string;
  authorId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SitemapArticleDto {
  slug: string;
  publishedAt: string;
  updatedAt: string;
}

// ─── Moderation Types ───────────────────────────────────────────────────────

export const MODERATION_STATUSES = [
  'PENDING',
  'CLEAN',
  'FLAGGED',
  'DISMISSED',
  'CORRECTIONS_REQUESTED',
  'REJECTED',
] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export const MODERATION_FLAG_TYPES = ['PLAGIARISM', 'AI_CONTENT', 'BOTH'] as const;
export type ModerationFlagType = (typeof MODERATION_FLAG_TYPES)[number];

export const MODERATION_ADMIN_ACTIONS = [
  'DISMISS',
  'REQUEST_CORRECTIONS',
  'REJECT',
  'UNPUBLISH',
] as const;
export type ModerationAdminAction = (typeof MODERATION_ADMIN_ACTIONS)[number];

export interface FlaggedPassage {
  start: number;
  end: number;
  text: string;
  source?: string;
  similarity?: number;
  type: 'PLAGIARISM' | 'AI_CONTENT';
}

export interface ModerationReportDto {
  id: string;
  articleId: string;
  plagiarismScore: number;
  aiContentScore: number;
  flagType: ModerationFlagType | null;
  isFlagged: boolean;
  flaggedPassages: FlaggedPassage[] | null;
  status: ModerationStatus;
  adminId: string | null;
  adminAction: ModerationAdminAction | null;
  adminReason: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface FlaggedArticleDto {
  articleId: string;
  articleTitle: string;
  articleSlug: string;
  authorId: string;
  authorName: string;
  domain: string;
  submittedAt: string | null;
  moderationReport: ModerationReportDto;
}

export interface ModerationActionDto {
  articleId: string;
  action: ModerationAdminAction;
  reason: string;
}

export interface ArticleModerationCompletedEvent {
  articleId: string;
  authorId: string;
  isFlagged: boolean;
  flagType: ModerationFlagType | null;
  plagiarismScore: number;
  aiContentScore: number;
  timestamp: string;
  correlationId: string;
}

export interface ArticleModerationClearedEvent {
  articleId: string;
  authorId: string;
  domain: string;
  title: string;
  timestamp: string;
  correlationId: string;
}

export interface ArticleModeratedEvent {
  articleId: string;
  authorId: string;
  adminId: string;
  action: ModerationAdminAction;
  reason: string;
  timestamp: string;
  correlationId: string;
}

// ─── Publication Metrics Types ──────────────────────────────────────────────

export interface ReferralSourceDto {
  source: string;
  count: number;
}

export interface DailyViewsDto {
  date: string;
  views: number;
}

export interface ArticleMetricsDto {
  totalViews: number;
  uniqueViews: number;
  avgTimeOnPageSeconds: number | null;
  avgScrollDepthPercent: number | null;
  referralSources: ReferralSourceDto[];
  viewsOverTime: DailyViewsDto[];
  isEmbargoed: boolean;
  embargoEndsAt: string | null;
}

export interface ArticleRewardAllocationDto {
  articleId: string;
  articleTitle: string;
  compositeScore: number | null;
  authorId: string;
  authorName: string;
  editorId: string | null;
  editorName: string | null;
  authorSharePercent: number;
  editorSharePercent: number;
  allocatedAt: string;
}

export interface AuthorRewardSummaryDto {
  totalArticles: number;
  totalEvaluatedArticles: number;
  allocations: ArticleRewardAllocationDto[];
  averageScore: number | null;
}

export interface EditorRewardSummaryDto {
  totalReviewed: number;
  totalPublished: number;
  allocations: ArticleRewardAllocationDto[];
  averageScore: number | null;
}

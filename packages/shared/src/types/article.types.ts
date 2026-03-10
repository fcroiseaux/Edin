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

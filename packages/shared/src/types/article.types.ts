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

'use client';

import { useState } from 'react';
import {
  useFlaggedArticles,
  useDismissFlag,
  useRequestCorrections,
  useRejectArticle,
} from '../../../../hooks/use-moderation';
import { ModerationDetailDialog } from './moderation-detail-dialog';
import { ModerationActionDialog } from './moderation-action-dialog';
import type { FlaggedArticleDto, ModerationAdminAction } from '@edin/shared';

const FLAG_TYPE_LABELS: Record<string, string> = {
  PLAGIARISM: 'Plagiarism',
  AI_CONTENT: 'AI Content',
  BOTH: 'Both',
};

const FLAG_TYPE_COLORS: Record<string, string> = {
  PLAGIARISM: 'bg-[#B06B6B]/10 text-[#B06B6B]',
  AI_CONTENT: 'bg-[#C49A3C]/10 text-[#C49A3C]',
  BOTH: 'bg-[#B06B6B]/10 text-[#B06B6B]',
};

export function FlaggedArticlesTable() {
  const { articles, isLoading, error, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useFlaggedArticles();
  const [selectedArticle, setSelectedArticle] = useState<FlaggedArticleDto | null>(null);
  const [actionType, setActionType] = useState<ModerationAdminAction | null>(null);
  const [actionArticleId, setActionArticleId] = useState<string | null>(null);

  const dismissMutation = useDismissFlag();
  const correctionsMutation = useRequestCorrections();
  const rejectMutation = useRejectArticle();

  const handleAction = (articleId: string, action: ModerationAdminAction) => {
    setActionArticleId(articleId);
    setActionType(action);
  };

  const handleActionConfirm = async (reason: string) => {
    if (!actionArticleId || !actionType) return;

    const mutationMap: Record<string, typeof dismissMutation> = {
      DISMISS: dismissMutation,
      REQUEST_CORRECTIONS: correctionsMutation,
      REJECT: rejectMutation,
    };

    const mutation = mutationMap[actionType];
    if (!mutation) return;
    await mutation.mutateAsync({ articleId: actionArticleId, reason });
    setActionType(null);
    setActionArticleId(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-[var(--spacing-md)]" data-testid="loading-skeleton">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-16 animate-pulse rounded-[var(--radius-md)] bg-surface-raised"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[var(--radius-md)] border border-red-200 bg-red-50 p-[var(--spacing-lg)]">
        <p className="font-sans text-[14px] text-red-700">
          Failed to load flagged articles. Please try again.
        </p>
      </div>
    );
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised p-[var(--spacing-2xl)] text-center">
        <p className="font-sans text-[15px] text-brand-secondary">
          No flagged articles require review
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-surface-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-border bg-surface-raised">
              <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-left font-sans text-[13px] font-medium text-brand-secondary">
                Article
              </th>
              <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-left font-sans text-[13px] font-medium text-brand-secondary">
                Author
              </th>
              <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-left font-sans text-[13px] font-medium text-brand-secondary">
                Flag Type
              </th>
              <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-left font-sans text-[13px] font-medium text-brand-secondary">
                Confidence
              </th>
              <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-left font-sans text-[13px] font-medium text-brand-secondary">
                Date
              </th>
              <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-right font-sans text-[13px] font-medium text-brand-secondary">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {articles.map((item: FlaggedArticleDto) => {
              const report = item.moderationReport;
              const maxScore = Math.max(report.plagiarismScore, report.aiContentScore);
              const confidencePercent = Math.round(maxScore * 100);

              return (
                <tr
                  key={item.articleId}
                  className="border-b border-surface-border last:border-b-0 hover:bg-surface-raised/50"
                >
                  <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)]">
                    <span className="font-sans text-[14px] font-medium text-brand-primary">
                      {item.articleTitle}
                    </span>
                  </td>
                  <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)]">
                    <span className="font-sans text-[14px] text-brand-secondary">
                      {item.authorName}
                    </span>
                  </td>
                  <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)]">
                    {report.flagType && (
                      <span
                        className={`inline-block rounded-full px-[var(--spacing-sm)] py-1 font-sans text-[12px] font-medium ${FLAG_TYPE_COLORS[report.flagType] ?? ''}`}
                      >
                        {FLAG_TYPE_LABELS[report.flagType] ?? report.flagType}
                      </span>
                    )}
                  </td>
                  <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)]">
                    <div className="flex items-center gap-[var(--spacing-xs)]">
                      <div className="h-2 w-16 overflow-hidden rounded-full bg-surface-border">
                        <div
                          className="h-full rounded-full bg-brand-accent"
                          style={{ width: `${confidencePercent}%` }}
                        />
                      </div>
                      <span className="font-sans text-[13px] text-brand-secondary">
                        {confidencePercent}%
                      </span>
                    </div>
                  </td>
                  <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)]">
                    <span className="font-sans text-[13px] text-brand-secondary">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-right">
                    <div className="flex items-center justify-end gap-[var(--spacing-xs)]">
                      <button
                        type="button"
                        onClick={() => setSelectedArticle(item)}
                        className="rounded-[var(--radius-sm)] px-[var(--spacing-sm)] py-1 font-sans text-[13px] text-brand-accent hover:bg-brand-accent/10"
                      >
                        View Report
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(item.articleId, 'DISMISS')}
                        className="rounded-[var(--radius-sm)] px-[var(--spacing-sm)] py-1 font-sans text-[13px] text-green-700 hover:bg-green-50"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(item.articleId, 'REQUEST_CORRECTIONS')}
                        className="rounded-[var(--radius-sm)] px-[var(--spacing-sm)] py-1 font-sans text-[13px] text-[#C49A3C] hover:bg-[#C49A3C]/10"
                      >
                        Corrections
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAction(item.articleId, 'REJECT')}
                        className="rounded-[var(--radius-sm)] px-[var(--spacing-sm)] py-1 font-sans text-[13px] text-red-700 hover:bg-red-50"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasNextPage && (
        <div className="mt-[var(--spacing-md)] text-center">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-[var(--radius-md)] bg-surface-raised px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-secondary hover:text-brand-primary disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}

      {selectedArticle && (
        <ModerationDetailDialog
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          onDismiss={(id) => handleAction(id, 'DISMISS')}
          onRequestCorrections={(id) => handleAction(id, 'REQUEST_CORRECTIONS')}
          onReject={(id) => handleAction(id, 'REJECT')}
        />
      )}

      {actionType && actionArticleId && (
        <ModerationActionDialog
          action={actionType}
          onConfirm={handleActionConfirm}
          onCancel={() => {
            setActionType(null);
            setActionArticleId(null);
          }}
          isLoading={
            dismissMutation.isPending || correctionsMutation.isPending || rejectMutation.isPending
          }
        />
      )}
    </>
  );
}

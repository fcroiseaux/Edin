'use client';

import { useState } from 'react';
import { useReceivedFeedback } from '../../../hooks/use-received-feedback';
import { RATING_LABELS, RUBRIC_QUESTIONS } from '@edin/shared';
import type { RubricData } from '@edin/shared';

const QUESTION_LABELS: Record<string, string> = Object.fromEntries(
  RUBRIC_QUESTIONS.map((q) => [q.id, q.text]),
);

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function AvatarFallback({ name, domain }: { name: string; domain: string | null }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const domainColors: Record<string, string> = {
    Technology: 'bg-[#2D8B8B]',
    Fintech: 'bg-[#C4956A]',
    Impact: 'bg-[#A85A5A]',
    Governance: 'bg-[#6B5B8A]',
  };

  const bgColor = domain ? (domainColors[domain] ?? 'bg-brand-secondary') : 'bg-brand-secondary';

  return (
    <div
      className={`flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-full text-[13px] font-medium text-white ${bgColor}`}
    >
      {initials}
    </div>
  );
}

interface FeedbackCardProps {
  feedback: {
    id: string;
    ratings: RubricData | null;
    comments: string | null;
    submittedAt: string | null;
    contribution: { id: string; title: string; contributionType: string };
    reviewer: { id: string; name: string; avatarUrl: string | null; domain: string | null };
  };
}

function FeedbackCard({ feedback }: FeedbackCardProps) {
  const [expanded, setExpanded] = useState(false);
  const responses = feedback.ratings?.responses ?? [];
  const visibleResponses = expanded ? responses : responses.slice(0, 2);
  const hasMore = responses.length > 2;

  const typeLabel =
    feedback.contribution.contributionType === 'COMMIT'
      ? 'Commit'
      : feedback.contribution.contributionType === 'PULL_REQUEST'
        ? 'Pull Request'
        : 'Code Review';

  return (
    <div className="rounded-[12px] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-sm">
      {/* Reviewer info */}
      <div className="flex items-center gap-[var(--spacing-sm)]">
        {feedback.reviewer.avatarUrl ? (
          <img
            src={feedback.reviewer.avatarUrl}
            alt={feedback.reviewer.name}
            className="h-[36px] w-[36px] rounded-full object-cover"
          />
        ) : (
          <AvatarFallback name={feedback.reviewer.name} domain={feedback.reviewer.domain} />
        )}
        <div className="min-w-0">
          <p className="truncate font-sans text-[14px] font-medium text-brand-primary">
            {feedback.reviewer.name}
          </p>
          {feedback.reviewer.domain && (
            <span className="font-sans text-[12px] text-brand-secondary">
              {feedback.reviewer.domain}
            </span>
          )}
        </div>
      </div>

      {/* Contribution reference */}
      <div className="mt-[var(--spacing-sm)] flex items-center gap-[var(--spacing-sm)]">
        <span className="inline-flex rounded-[var(--radius-sm)] bg-brand-accent-subtle px-[var(--spacing-xs)] py-[1px] font-sans text-[11px] font-medium text-brand-accent">
          {typeLabel}
        </span>
        <span className="truncate font-sans text-[13px] text-brand-secondary">
          {feedback.contribution.title}
        </span>
      </div>

      {feedback.submittedAt && (
        <p className="mt-[var(--spacing-xs)] font-sans text-[12px] text-brand-secondary/70">
          {formatDate(feedback.submittedAt)}
        </p>
      )}

      {/* Rubric responses */}
      <div className="mt-[var(--spacing-md)] space-y-[var(--spacing-md)]">
        {visibleResponses.map((response) => (
          <div key={response.questionId}>
            <div className="flex items-baseline gap-[var(--spacing-sm)]">
              <span className="font-sans text-[13px] font-medium text-brand-primary">
                {QUESTION_LABELS[response.questionId] ?? response.questionId}
              </span>
              <span className="font-sans text-[13px] text-brand-secondary">
                {response.rating} &mdash; {RATING_LABELS[response.rating] ?? ''}
              </span>
            </div>
            <p className="mt-[var(--spacing-xs)] font-serif text-[14px] leading-relaxed text-brand-primary">
              {response.comment}
            </p>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-[var(--spacing-sm)] font-sans text-[13px] font-medium text-brand-accent hover:underline"
        >
          {expanded ? 'Show less' : 'See full feedback'}
        </button>
      )}

      {feedback.comments && (
        <div className="mt-[var(--spacing-md)] border-t border-surface-border pt-[var(--spacing-md)]">
          <p className="font-sans text-[12px] font-medium text-brand-secondary">Overall Comment</p>
          <p className="mt-[var(--spacing-xs)] font-serif text-[14px] leading-relaxed text-brand-primary">
            {feedback.comments}
          </p>
        </div>
      )}
    </div>
  );
}

export function ReceivedFeedbackList() {
  const { items, isPending, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useReceivedFeedback();

  if (isPending) {
    return (
      <div className="space-y-[var(--spacing-md)]">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-[200px] animate-pulse rounded-[12px] border border-surface-border bg-surface-raised"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="font-sans text-[14px] text-semantic-error">Failed to load received feedback.</p>
    );
  }

  if (items.length === 0) {
    return (
      <p className="font-sans text-[14px] text-brand-secondary">
        No feedback received yet. Feedback will appear here as reviewers complete their reviews.
      </p>
    );
  }

  return (
    <div className="space-y-[var(--spacing-md)]">
      {items.map((feedback) => (
        <FeedbackCard key={feedback.id} feedback={feedback} />
      ))}

      {hasNextPage && (
        <div className="flex justify-center pt-[var(--spacing-md)]">
          <button
            type="button"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-[var(--radius-md)] border border-surface-border bg-surface-raised px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[13px] font-medium text-brand-primary transition-[background-color] duration-[var(--transition-fast)] hover:bg-surface-base disabled:opacity-50 motion-reduce:transition-none"
          >
            {isFetchingNextPage ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}

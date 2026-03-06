'use client';

import { useContributionDetail } from '../../../hooks/use-contribution-detail';

const TYPE_LABELS: Record<string, string> = {
  COMMIT: 'Commit',
  PULL_REQUEST: 'Pull Request',
  CODE_REVIEW: 'Code Review',
};

interface ContributionDetailProps {
  contributionId: string;
  onClose: () => void;
}

export function ContributionDetail({ contributionId, onClose }: ContributionDetailProps) {
  const { contribution, isLoading } = useContributionDetail(contributionId);

  if (isLoading) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
        <div className="space-y-[var(--spacing-md)]">
          <div className="skeleton h-[24px] w-[200px]" />
          <div className="skeleton h-[16px] w-[300px]" />
          <div className="skeleton h-[100px] w-full" />
        </div>
      </div>
    );
  }

  if (!contribution) {
    return null;
  }

  const rawData = contribution.rawData as Record<string, unknown>;
  const extracted = rawData?.extracted as Record<string, unknown> | undefined;

  return (
    <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-sans text-[18px] font-medium text-brand-primary">
            {contribution.title}
          </h3>
          <div className="mt-[var(--spacing-xs)] flex items-center gap-[var(--spacing-sm)]">
            <span className="font-sans text-[13px] text-brand-secondary">
              {TYPE_LABELS[contribution.contributionType] ?? contribution.contributionType}
            </span>
            <span className="text-brand-secondary/40" aria-hidden="true">
              ·
            </span>
            <span className="font-sans text-[13px] text-brand-secondary">
              {contribution.repositoryName}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] min-w-[44px] rounded-[var(--radius-sm)] p-[var(--spacing-xs)] font-sans text-[18px] text-brand-secondary transition-colors hover:bg-surface-sunken"
          aria-label="Close detail view"
        >
          &times;
        </button>
      </div>

      {/* Status indicator - calm style per UX spec */}
      <div className="mt-[var(--spacing-md)] inline-flex items-center rounded-full border border-surface-border bg-surface-sunken px-[var(--spacing-sm)] py-[2px]">
        <span className="font-sans text-[13px] text-brand-secondary">
          {contribution.status === 'EVALUATED' ? 'Evaluated' : 'Awaiting evaluation'}
        </span>
      </div>

      {/* Details grid */}
      <dl className="mt-[var(--spacing-lg)] space-y-[var(--spacing-md)]">
        <div>
          <dt className="font-sans text-[13px] font-medium uppercase tracking-wide text-brand-secondary">
            Source
          </dt>
          <dd className="mt-[2px] font-sans text-[15px] text-brand-primary">
            {contribution.source}
          </dd>
        </div>

        <div>
          <dt className="font-sans text-[13px] font-medium uppercase tracking-wide text-brand-secondary">
            Timestamp
          </dt>
          <dd className="mt-[2px] font-sans text-[15px] text-brand-primary">
            {new Date(contribution.normalizedAt).toLocaleString()}
          </dd>
        </div>

        {contribution.description && (
          <div>
            <dt className="font-sans text-[13px] font-medium uppercase tracking-wide text-brand-secondary">
              Description
            </dt>
            <dd className="mt-[2px] whitespace-pre-wrap font-sans text-[15px] leading-[1.6] text-brand-primary">
              {contribution.description}
            </dd>
          </div>
        )}

        {/* Commit-specific details */}
        {contribution.contributionType === 'COMMIT' && extracted && (
          <>
            {extracted.filesChanged && (
              <div>
                <dt className="font-sans text-[13px] font-medium uppercase tracking-wide text-brand-secondary">
                  Files Changed
                </dt>
                <dd className="mt-[2px] flex gap-[var(--spacing-md)] font-sans text-[15px] text-brand-primary">
                  <span className="text-green-600">
                    +{(extracted.filesChanged as Record<string, string[]>)?.added?.length ?? 0}{' '}
                    added
                  </span>
                  <span className="text-red-600">
                    -{(extracted.filesChanged as Record<string, string[]>)?.removed?.length ?? 0}{' '}
                    removed
                  </span>
                  <span className="text-brand-secondary">
                    ~{(extracted.filesChanged as Record<string, string[]>)?.modified?.length ?? 0}{' '}
                    modified
                  </span>
                </dd>
              </div>
            )}
          </>
        )}

        {/* PR-specific details */}
        {contribution.contributionType === 'PULL_REQUEST' && rawData && (
          <>
            {rawData.number != null && (
              <div>
                <dt className="font-sans text-[13px] font-medium uppercase tracking-wide text-brand-secondary">
                  PR Number
                </dt>
                <dd className="mt-[2px] font-sans text-[15px] text-brand-primary">
                  #{String(rawData.number)}
                </dd>
              </div>
            )}
            {rawData.head && rawData.base && (
              <div>
                <dt className="font-sans text-[13px] font-medium uppercase tracking-wide text-brand-secondary">
                  Branch
                </dt>
                <dd className="mt-[2px] font-sans text-[15px] text-brand-primary">
                  {String((rawData.head as Record<string, unknown>).ref)} &rarr;{' '}
                  {String((rawData.base as Record<string, unknown>).ref)}
                </dd>
              </div>
            )}
            <div>
              <dt className="font-sans text-[13px] font-medium uppercase tracking-wide text-brand-secondary">
                Merge Status
              </dt>
              <dd className="mt-[2px] font-sans text-[15px] text-brand-primary">
                {rawData.merged
                  ? 'Merged'
                  : rawData.state === 'open'
                    ? 'Open'
                    : String(rawData.state ?? 'Unknown')}
              </dd>
            </div>
          </>
        )}

        {/* Review-specific details */}
        {contribution.contributionType === 'CODE_REVIEW' && rawData && (
          <div>
            <dt className="font-sans text-[13px] font-medium uppercase tracking-wide text-brand-secondary">
              Review State
            </dt>
            <dd className="mt-[2px] font-sans text-[15px] capitalize text-brand-primary">
              {String(rawData.state ?? 'Unknown')
                .replace('_', ' ')
                .toLowerCase()}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import type { NewspaperItemDto } from '@edin/shared';
import { useEditorialCuration } from '../../../hooks/use-editorial-curation';

interface EditorialCurationPanelProps {
  editionId: string;
  items: NewspaperItemDto[];
  isEditor: boolean;
}

export function EditorialCurationPanel({
  editionId,
  items,
  isEditor,
}: EditorialCurationPanelProps) {
  const {
    isEditMode,
    enterEditMode,
    exitEditMode,
    pendingChanges,
    promoteItem,
    demoteItem,
    setAsHeadline,
    resetItem,
    saveCuration,
    hasPendingChanges,
    isSaving,
    saveError,
  } = useEditorialCuration(editionId);

  const maxRank = items.length;

  // Compute effective ranks for each item (accounting for pending changes)
  const itemsWithEffectiveRank = useMemo(() => {
    return items.map((item) => {
      const pendingRank = pendingChanges.get(item.id);
      const effectiveRank = pendingRank !== undefined ? (pendingRank ?? item.rank) : item.rank;
      const hasPending = pendingChanges.has(item.id);
      return { ...item, effectiveRank, hasPending };
    });
  }, [items, pendingChanges]);

  if (!isEditor) return null;

  if (!isEditMode) {
    return (
      <div className="mb-6">
        <button
          onClick={enterEditMode}
          className="flex items-center gap-2 rounded-radius-md border border-accent-primary/30 bg-surface-raised px-4 py-2 text-body-sm font-medium text-accent-primary transition-colors hover:bg-accent-primary/10 min-h-[44px]"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M11.5 1.5L14.5 4.5L5 14H2V11L11.5 1.5Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Edit Edition
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-radius-lg border border-accent-primary/30 bg-surface-raised p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <h2 className="font-sans text-body font-semibold text-text-primary">Editorial Curation</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={exitEditMode}
            disabled={isSaving}
            className="rounded-radius-md border border-surface-subtle px-3 py-1.5 text-body-sm text-text-secondary transition-colors hover:bg-surface-subtle min-h-[44px]"
          >
            Discard
          </button>
          <button
            onClick={saveCuration}
            disabled={!hasPendingChanges || isSaving}
            className="rounded-radius-md bg-accent-primary px-4 py-1.5 text-body-sm font-medium text-white transition-colors hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {isSaving ? 'Saving...' : 'Publish Curation'}
          </button>
        </div>
      </div>

      {saveError && (
        <div
          className="mb-3 rounded-radius-md bg-status-error/10 border border-status-error/20 px-3 py-2 text-body-sm text-status-error"
          role="alert"
        >
          {saveError.message}
        </div>
      )}

      {/* Items list */}
      <div className="space-y-2">
        {itemsWithEffectiveRank.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-3 rounded-radius-md border p-3 transition-colors ${
              item.hasPending
                ? 'border-accent-primary/40 bg-accent-primary/5'
                : 'border-surface-subtle bg-surface-base'
            }`}
          >
            {/* Rank indicator */}
            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-surface-subtle flex items-center justify-center text-body-sm font-medium text-text-secondary">
              {item.effectiveRank}
            </span>

            {/* Item info */}
            <div className="flex-1 min-w-0">
              <p className="text-body-sm font-medium text-text-primary truncate">{item.headline}</p>
              <p className="text-caption text-text-tertiary">
                Tier {item.significanceScore} &middot; {item.chathamHouseLabel}
              </p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Set as Headline */}
              {item.effectiveRank !== 1 && (
                <button
                  onClick={() => setAsHeadline(item.id)}
                  className="rounded-radius-sm p-2 text-text-tertiary transition-colors hover:bg-surface-subtle hover:text-accent-primary min-w-[44px] min-h-[44px] flex items-center justify-center"
                  title="Set as Headline"
                  aria-label={`Set "${item.headline}" as headline`}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M8 2L14 8H10V14H6V8H2L8 2Z" fill="currentColor" />
                  </svg>
                </button>
              )}

              {/* Promote (up) */}
              <button
                onClick={() => promoteItem(item.id, item.effectiveRank)}
                disabled={item.effectiveRank <= 1}
                className="rounded-radius-sm p-2 text-text-tertiary transition-colors hover:bg-surface-subtle hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Promote"
                aria-label={`Promote "${item.headline}"`}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 4L12 8H4L8 4Z" fill="currentColor" />
                </svg>
              </button>

              {/* Demote (down) */}
              <button
                onClick={() => demoteItem(item.id, item.effectiveRank, maxRank)}
                disabled={item.effectiveRank >= maxRank}
                className="rounded-radius-sm p-2 text-text-tertiary transition-colors hover:bg-surface-subtle hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Demote"
                aria-label={`Demote "${item.headline}"`}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 12L4 8H12L8 12Z" fill="currentColor" />
                </svg>
              </button>

              {/* Reset to algorithmic */}
              <button
                onClick={() => resetItem(item.id)}
                className="rounded-radius-sm p-2 text-text-tertiary transition-colors hover:bg-surface-subtle hover:text-status-warning min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Reset to Algorithmic Order"
                aria-label={`Reset "${item.headline}" to algorithmic order`}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M2 8C2 4.69 4.69 2 8 2C10.22 2 12.16 3.26 13.19 5.11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M14 8C14 11.31 11.31 14 8 14C5.78 14 3.84 12.74 2.81 10.89"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M13 2V5.5H9.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {hasPendingChanges && (
        <p className="mt-3 text-caption text-text-tertiary">
          {pendingChanges.size} item{pendingChanges.size !== 1 ? 's' : ''} modified. Click
          &quot;Publish Curation&quot; to apply.
        </p>
      )}
    </div>
  );
}

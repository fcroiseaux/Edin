'use client';

import type { NewspaperEditionDto } from '@edin/shared';

interface EditionViewingBannerProps {
  edition: NewspaperEditionDto;
  onBackToLatest: () => void;
}

export function EditionViewingBanner({ edition, onBackToLatest }: EditionViewingBannerProps) {
  return (
    <div
      className="rounded-radius-lg bg-surface-elevated border border-surface-subtle px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
      role="status"
      aria-live="polite"
    >
      <p className="text-body-sm text-text-secondary" data-testid="edition-viewing-text">
        Viewing Edition #{edition.editionNumber}
        {edition.referenceScaleMetadata.temporalSpanHumanReadable
          ? ` \u2014 ${edition.referenceScaleMetadata.temporalSpanHumanReadable}`
          : ''}
      </p>
      <button
        onClick={onBackToLatest}
        className="text-body-sm font-medium text-accent-primary hover:underline transition-colors min-h-[44px] px-2"
        data-testid="back-to-latest"
      >
        Back to Latest
      </button>
    </div>
  );
}

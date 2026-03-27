'use client';

const SOURCE_TYPE_ICONS: Record<string, { icon: string; label: string }> = {
  PRIZE_AWARDED: { icon: '\u2728', label: 'Prize Awarded' },
  TRACK_RECORD_MILESTONE: { icon: '\u{1F6A9}', label: 'Milestone' },
  PEER_NOMINATION_RECEIVED: { icon: '\u{1F64B}', label: 'Nomination' },
  CONTRIBUTION_EVALUATED: { icon: '\u2705', label: 'Evaluation' },
  CROSS_DOMAIN_COLLABORATION: { icon: '\u{1F517}', label: 'Collaboration' },
  CUSTOM: { icon: '\u{1F4CC}', label: 'Update' },
};

interface SourceTypeIconProps {
  sourceEventType: string;
  headline?: string;
  className?: string;
}

export function SourceTypeIcon({ sourceEventType, headline, className }: SourceTypeIconProps) {
  // Distinguish prize subtypes from headline content
  if (sourceEventType === 'PRIZE_AWARDED' && headline) {
    const lower = headline.toLowerCase();
    if (lower.includes('cross-domain') || lower.includes('collaboration')) {
      return (
        <span
          className={className}
          role="img"
          aria-label="Cross-Domain Collaboration Prize"
          title="Cross-Domain Collaboration Prize"
        >
          {'\u{1F517}'}
        </span>
      );
    }
    if (lower.includes('breakthrough')) {
      return (
        <span
          className={className}
          role="img"
          aria-label="Breakthrough Prize"
          title="Breakthrough Prize"
        >
          {'\u{1F31F}'}
        </span>
      );
    }
    if (lower.includes('community') || lower.includes('recognition')) {
      return (
        <span
          className={className}
          role="img"
          aria-label="Community Recognition Prize"
          title="Community Recognition Prize"
        >
          {'\u{1F91D}'}
        </span>
      );
    }
  }

  const config = SOURCE_TYPE_ICONS[sourceEventType] ?? SOURCE_TYPE_ICONS.CUSTOM;
  return (
    <span className={className} role="img" aria-label={config.label} title={config.label}>
      {config.icon}
    </span>
  );
}

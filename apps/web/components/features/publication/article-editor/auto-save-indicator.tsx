'use client';

import { useEffect, useState } from 'react';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AutoSaveIndicatorProps {
  status: SaveStatus;
}

export function AutoSaveIndicator({ status }: AutoSaveIndicatorProps) {
  const [prevStatus, setPrevStatus] = useState(status);
  const [fadeOut, setFadeOut] = useState(false);

  // Adjust state when status prop changes (React-supported render-time state update)
  if (prevStatus !== status) {
    setPrevStatus(status);
    setFadeOut(false);
  }

  useEffect(() => {
    if (status === 'saved') {
      const timer = setTimeout(() => setFadeOut(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const visible = status === 'saving' || status === 'error' || (status === 'saved' && !fadeOut);

  if (!visible) return null;

  return (
    <span
      className={`inline-flex items-center gap-[var(--spacing-xs)] font-sans text-[13px] transition-opacity duration-200 ${
        status === 'saving'
          ? 'text-brand-secondary'
          : status === 'saved'
            ? 'text-semantic-success'
            : 'text-semantic-error'
      }`}
      aria-live="polite"
    >
      {status === 'saving' && 'Saving...'}
      {status === 'saved' && 'Saved'}
      {status === 'error' && 'Save failed'}
    </span>
  );
}

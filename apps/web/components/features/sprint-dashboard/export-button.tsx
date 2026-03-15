'use client';

import { useState, useRef, useEffect } from 'react';
import { getAccessToken } from '../../../lib/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ExportButtonProps {
  domain?: string;
  limit?: number;
}

export function ExportButton({ domain, limit }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Clear error after 5 seconds
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  async function handleExport(format: 'csv' | 'pdf') {
    setDownloading(true);
    setOpen(false);
    setError(null);

    try {
      const params = new URLSearchParams({ format });
      if (domain) params.set('domain', domain);
      if (limit) params.set('limit', String(limit));

      const token = getAccessToken();
      const response = await fetch(`${API_BASE_URL}/api/v1/sprints/export?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Export failed (${response.status})`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = format === 'csv' ? 'csv' : 'pdf';
      a.download = `sprint-report-${new Date().toISOString().split('T')[0]}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        disabled={downloading}
        className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-lg)] py-[var(--spacing-sm)] text-[14px] font-medium text-brand-accent hover:bg-brand-accent/10 disabled:opacity-50"
        aria-label="Export sprint report"
        aria-expanded={open}
        aria-haspopup="true"
      >
        {downloading ? 'Exporting\u2026' : 'Export'}
      </button>

      {error && (
        <p className="absolute right-0 top-full z-10 mt-[var(--spacing-xs)] whitespace-nowrap rounded-[var(--radius-md)] border border-red-300 bg-red-50 px-[var(--spacing-md)] py-[var(--spacing-xs)] text-[12px] text-red-700">
          {error}
        </p>
      )}

      {open && !error && (
        <div
          className="absolute right-0 top-full z-10 mt-[var(--spacing-xs)] min-w-[140px] rounded-[var(--radius-md)] border border-surface-border bg-surface-raised shadow-lg"
          role="menu"
        >
          <button
            onClick={() => handleExport('csv')}
            className="block w-full px-[var(--spacing-lg)] py-[var(--spacing-sm)] text-left text-[14px] text-brand-primary hover:bg-brand-accent/10"
            role="menuitem"
          >
            Download CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="block w-full px-[var(--spacing-lg)] py-[var(--spacing-sm)] text-left text-[14px] text-brand-primary hover:bg-brand-accent/10"
            role="menuitem"
          >
            Download PDF
          </button>
        </div>
      )}
    </div>
  );
}

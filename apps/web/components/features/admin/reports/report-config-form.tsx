'use client';

import { useState } from 'react';
import { KPI_DEFINITIONS } from '@edin/shared';
import type { ReportConfig } from '@edin/shared';

interface ReportConfigFormProps {
  onSubmit: (config: ReportConfig) => void;
  isPending: boolean;
}

export function ReportConfigForm({ onSubmit, isPending }: ReportConfigFormProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedKpis, setSelectedKpis] = useState<string[]>([]);
  const [format, setFormat] = useState<'csv' | 'json'>('csv');

  const toggleKpi = (kpiId: string) => {
    setSelectedKpis((prev) =>
      prev.includes(kpiId) ? prev.filter((id) => id !== kpiId) : [...prev, kpiId],
    );
  };

  const selectAll = () => {
    setSelectedKpis(KPI_DEFINITIONS.map((k) => k.id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || selectedKpis.length === 0) return;
    onSubmit({ startDate, endDate, kpiIds: selectedKpis, format });
  };

  const isValid = startDate && endDate && selectedKpis.length > 0;

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]"
    >
      <h2 className="font-serif text-[18px] font-bold text-brand-primary">Generate Report</h2>
      <p className="mt-[var(--spacing-xs)] font-serif text-[13px] text-brand-secondary">
        Select a date range, KPIs, and output format.
      </p>

      <div className="mt-[var(--spacing-lg)] grid gap-[var(--spacing-md)] sm:grid-cols-2">
        <div>
          <label
            htmlFor="start-date"
            className="block font-sans text-[13px] font-medium text-brand-primary"
          >
            Start Date
          </label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="mt-[var(--spacing-xs)] w-full rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary"
            required
            aria-describedby="start-date-desc"
          />
          <span id="start-date-desc" className="sr-only">
            Report period start date
          </span>
        </div>
        <div>
          <label
            htmlFor="end-date"
            className="block font-sans text-[13px] font-medium text-brand-primary"
          >
            End Date
          </label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="mt-[var(--spacing-xs)] w-full rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary"
            required
            aria-describedby="end-date-desc"
          />
          <span id="end-date-desc" className="sr-only">
            Report period end date
          </span>
        </div>
      </div>

      <fieldset className="mt-[var(--spacing-lg)]">
        <legend className="font-sans text-[13px] font-medium text-brand-primary">
          Select KPIs
        </legend>
        <button
          type="button"
          onClick={selectAll}
          className="mt-[var(--spacing-xs)] font-sans text-[12px] text-brand-accent underline underline-offset-2"
        >
          Select all
        </button>
        <div className="mt-[var(--spacing-sm)] grid gap-[var(--spacing-xs)] sm:grid-cols-2">
          {KPI_DEFINITIONS.map((kpi) => (
            <label
              key={kpi.id}
              className="flex items-center gap-[var(--spacing-xs)] font-sans text-[13px] text-brand-primary"
            >
              <input
                type="checkbox"
                checked={selectedKpis.includes(kpi.id)}
                onChange={() => toggleKpi(kpi.id)}
                className="rounded border-surface-border"
              />
              {kpi.label}
              <span className="text-[11px] text-brand-secondary">({kpi.category})</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-[var(--spacing-lg)]">
        <label className="block font-sans text-[13px] font-medium text-brand-primary">Format</label>
        <div className="mt-[var(--spacing-xs)] flex gap-[var(--spacing-md)]">
          {(['csv', 'json'] as const).map((f) => (
            <label
              key={f}
              className="flex items-center gap-[var(--spacing-xs)] font-sans text-[13px] text-brand-primary"
            >
              <input
                type="radio"
                name="format"
                value={f}
                checked={format === f}
                onChange={() => setFormat(f)}
                className="border-surface-border"
              />
              {f.toUpperCase()}
            </label>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={!isValid || isPending}
        className="mt-[var(--spacing-lg)] inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? 'Generating...' : 'Generate Report'}
      </button>
    </form>
  );
}

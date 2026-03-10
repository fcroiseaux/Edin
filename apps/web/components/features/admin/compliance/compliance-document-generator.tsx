'use client';

import { useState } from 'react';
import { useGenerateComplianceDocument } from '../../../../hooks/use-compliance-documents';
import type { ComplianceDocumentTypeValue } from '@edin/shared';

const DOCUMENT_TYPES: { value: ComplianceDocumentTypeValue; label: string; description: string }[] =
  [
    {
      value: 'MODEL_CARD',
      label: 'Model Card',
      description: 'Documents AI model capabilities, limitations, and intended use cases.',
    },
    {
      value: 'EVALUATION_CRITERIA',
      label: 'Evaluation Criteria',
      description: 'Documents the criteria and methodology used for AI-assisted evaluation.',
    },
    {
      value: 'HUMAN_OVERSIGHT_REPORT',
      label: 'Human Oversight Report',
      description: 'Documents human oversight measures and intervention capabilities.',
    },
    {
      value: 'DATA_PROCESSING_RECORD',
      label: 'Data Processing Record',
      description: 'Documents data processing activities as required by Article 30.',
    },
  ];

export function ComplianceDocumentGenerator() {
  const [selectedType, setSelectedType] = useState<ComplianceDocumentTypeValue | ''>('');
  const generateMutation = useGenerateComplianceDocument();

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    generateMutation.mutate(selectedType, {
      onSuccess: () => {
        setSelectedType('');
      },
    });
  };

  const selectedTypeInfo = DOCUMENT_TYPES.find((t) => t.value === selectedType);

  return (
    <form
      onSubmit={handleGenerate}
      className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]"
    >
      <h2 className="font-serif text-[18px] font-bold text-brand-primary">Generate Document</h2>
      <p className="mt-[var(--spacing-xs)] font-sans text-[13px] text-brand-secondary">
        Generate an EU AI Act compliance document from current platform data.
      </p>

      <div className="mt-[var(--spacing-lg)]">
        <label
          htmlFor="document-type"
          className="block font-sans text-[13px] font-medium text-brand-primary"
        >
          Document Type
        </label>
        <select
          id="document-type"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value as ComplianceDocumentTypeValue | '')}
          className="mt-[var(--spacing-xs)] w-full rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary"
          required
        >
          <option value="">Select a document type...</option>
          {DOCUMENT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {selectedTypeInfo && (
        <p className="mt-[var(--spacing-sm)] font-sans text-[12px] text-brand-secondary">
          {selectedTypeInfo.description}
        </p>
      )}

      {generateMutation.error && (
        <div className="mt-[var(--spacing-md)] rounded-[var(--radius-md)] border border-red-300 bg-red-50 p-[var(--spacing-sm)] text-[13px] text-red-700">
          {generateMutation.error.message}
        </div>
      )}

      {generateMutation.isSuccess && (
        <div className="mt-[var(--spacing-md)] rounded-[var(--radius-md)] border border-green-300 bg-green-50 p-[var(--spacing-sm)] text-[13px] text-green-700">
          Document generated successfully.
        </div>
      )}

      <button
        type="submit"
        disabled={!selectedType || generateMutation.isPending}
        className="mt-[var(--spacing-lg)] inline-flex min-h-[44px] items-center rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[var(--spacing-sm)] font-sans text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {generateMutation.isPending ? 'Generating...' : 'Generate Document'}
      </button>
    </form>
  );
}

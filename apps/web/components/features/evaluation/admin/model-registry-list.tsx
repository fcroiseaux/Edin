'use client';

import type { EvaluationModelVersionDto } from '@edin/shared';

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  DEPRECATED: 'bg-amber-100 text-amber-800',
  RETIRED: 'bg-gray-100 text-gray-500',
};

interface ModelRegistryListProps {
  models: EvaluationModelVersionDto[];
  onSelectModel: (modelId: string) => void;
  selectedModelId: string | null;
}

export function ModelRegistryList({
  models,
  onSelectModel,
  selectedModelId,
}: ModelRegistryListProps) {
  if (models.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)] text-center text-brand-secondary">
        No evaluation models registered yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-surface-border">
      <table className="w-full text-left font-sans text-[14px]">
        <thead>
          <tr className="border-b border-surface-border bg-surface-raised">
            <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium text-brand-secondary">
              Name
            </th>
            <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium text-brand-secondary">
              Version
            </th>
            <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium text-brand-secondary">
              Provider
            </th>
            <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium text-brand-secondary">
              Status
            </th>
            <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium text-brand-secondary">
              Evaluations
            </th>
            <th className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium text-brand-secondary">
              Deployed
            </th>
          </tr>
        </thead>
        <tbody>
          {models.map((model) => (
            <tr
              key={model.id}
              onClick={() => onSelectModel(model.id)}
              className={`cursor-pointer border-b border-surface-border transition-colors hover:bg-surface-raised/50 ${
                selectedModelId === model.id ? 'bg-brand-accent/5' : ''
              }`}
            >
              <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-medium text-brand-primary">
                {model.name}
              </td>
              <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] font-mono text-[13px] text-brand-secondary">
                {model.version}
              </td>
              <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-brand-secondary">
                {model.provider}
              </td>
              <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)]">
                <span
                  className={`inline-block rounded-full px-[var(--spacing-sm)] py-[2px] text-[12px] font-medium ${
                    STATUS_STYLES[model.status] ?? 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {model.status}
                </span>
              </td>
              <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-brand-secondary">
                {model.evaluationCount}
              </td>
              <td className="px-[var(--spacing-md)] py-[var(--spacing-sm)] text-brand-secondary">
                {model.deployedAt ? new Date(model.deployedAt).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

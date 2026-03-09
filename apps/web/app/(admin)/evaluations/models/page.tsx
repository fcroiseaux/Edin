'use client';

import { useState } from 'react';
import {
  useEvaluationModels,
  useEvaluationModelMetrics,
} from '../../../../hooks/use-evaluation-models';
import { ModelRegistryList } from '../../../../components/features/evaluation/admin/model-registry-list';
import { ModelMetricsComparison } from '../../../../components/features/evaluation/admin/model-metrics-comparison';

export default function EvaluationModelsPage() {
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const { models, isLoading: modelsLoading, error: modelsError } = useEvaluationModels();
  const { metrics, isLoading: metricsLoading } = useEvaluationModelMetrics(selectedModelId);

  if (modelsLoading) {
    return (
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <div className="animate-pulse space-y-[var(--spacing-md)]">
          <div className="h-8 w-64 rounded bg-surface-border" />
          <div className="h-64 rounded-[var(--radius-lg)] bg-surface-border" />
        </div>
      </div>
    );
  }

  if (modelsError) {
    return (
      <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
        <p className="text-red-600">Failed to load evaluation models.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1200px] px-[var(--spacing-lg)] py-[var(--spacing-xl)]">
      <h1 className="font-serif text-[24px] font-bold text-brand-primary">
        Evaluation Model Registry
      </h1>
      <p className="mt-[var(--spacing-xs)] text-[14px] text-brand-secondary">
        Manage AI evaluation model versions, track performance, and compare metrics.
      </p>

      <div className="mt-[var(--spacing-lg)]">
        <ModelRegistryList
          models={models}
          onSelectModel={setSelectedModelId}
          selectedModelId={selectedModelId}
        />
      </div>

      <div className="mt-[var(--spacing-lg)]">
        <ModelMetricsComparison metrics={metrics} isLoading={metricsLoading} />
      </div>
    </div>
  );
}

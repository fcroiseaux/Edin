'use client';

import { useState } from 'react';
import {
  useEvaluationModels,
  useEvaluationModelMetrics,
  useCreateEvaluationModel,
  useAvailableModels,
} from '../../../../../hooks/use-evaluation-models';
import { useAgreementRates } from '../../../../../hooks/use-evaluation-review';
import { ModelRegistryList } from '../../../../../components/features/evaluation/admin/model-registry-list';
import { ModelMetricsComparison } from '../../../../../components/features/evaluation/admin/model-metrics-comparison';
import { AgreementRateCard } from '../../../../../components/features/evaluation/admin/agreement-rate-card';

export default function EvaluationModelsPage() {
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    apiModelId: '',
    evaluationType: 'CODE' as 'CODE' | 'DOCUMENTATION',
    version: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const { models, isLoading: modelsLoading, error: modelsError } = useEvaluationModels();
  const createModel = useCreateEvaluationModel();
  const {
    availableModels,
    isLoading: availableModelsLoading,
    error: availableModelsError,
  } = useAvailableModels();
  const { metrics, isLoading: metricsLoading } = useEvaluationModelMetrics(selectedModelId);
  const { rates, isLoading: ratesLoading } = useAgreementRates(selectedModelId ?? undefined);

  const clearForm = () => {
    setFormData({ apiModelId: '', evaluationType: 'CODE', version: '' });
    setFormError(null);
    createModel.reset();
  };

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
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[var(--spacing-sm)] text-[14px] font-medium text-white hover:bg-brand-accent/90"
          >
            Register New Model
          </button>
        ) : (
          <div className="rounded-[var(--radius-lg)] border border-surface-border bg-surface-raised p-[var(--spacing-lg)]">
            <h2 className="mb-[var(--spacing-md)] font-sans text-[16px] font-semibold text-brand-primary">
              Register New Model
            </h2>
            <div className="flex flex-wrap gap-[var(--spacing-md)]">
              <div className="flex-[2] min-w-[240px]">
                <label
                  htmlFor="api-model-id"
                  className="mb-[var(--spacing-xs)] block text-[13px] font-medium text-brand-secondary"
                >
                  Anthropic Model
                </label>
                {availableModelsLoading ? (
                  <div className="h-[38px] animate-pulse rounded-[var(--radius-md)] bg-surface-border" />
                ) : availableModelsError ? (
                  <p className="text-[12px] text-red-600">
                    Failed to load models from Anthropic API.
                  </p>
                ) : (
                  <select
                    id="api-model-id"
                    value={formData.apiModelId}
                    onChange={(e) => {
                      setFormData((f) => ({ ...f, apiModelId: e.target.value }));
                      setFormError(null);
                      if (createModel.error) createModel.reset();
                    }}
                    className="w-full rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary focus:border-brand-accent focus:outline-none"
                  >
                    <option value="">Select a model...</option>
                    {availableModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.displayName} ({m.id})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="min-w-[180px]">
                <label
                  htmlFor="evaluation-type"
                  className="mb-[var(--spacing-xs)] block text-[13px] font-medium text-brand-secondary"
                >
                  Evaluation Type
                </label>
                <select
                  id="evaluation-type"
                  value={formData.evaluationType}
                  onChange={(e) => {
                    setFormData((f) => ({
                      ...f,
                      evaluationType: e.target.value as 'CODE' | 'DOCUMENTATION',
                    }));
                    setFormError(null);
                    if (createModel.error) createModel.reset();
                  }}
                  className="w-full rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary focus:border-brand-accent focus:outline-none"
                >
                  <option value="CODE">Code</option>
                  <option value="DOCUMENTATION">Documentation</option>
                </select>
              </div>
              <div className="flex-1 min-w-[140px]">
                <label
                  htmlFor="model-version"
                  className="mb-[var(--spacing-xs)] block text-[13px] font-medium text-brand-secondary"
                >
                  Version Label
                </label>
                <input
                  id="model-version"
                  type="text"
                  value={formData.version}
                  onChange={(e) => {
                    setFormData((f) => ({ ...f, version: e.target.value }));
                    setFormError(null);
                    if (createModel.error) createModel.reset();
                  }}
                  placeholder="e.g. v1, 2025-03-11"
                  className="w-full rounded-[var(--radius-md)] border border-surface-border bg-surface-base px-[var(--spacing-md)] py-[var(--spacing-sm)] font-sans text-[14px] text-brand-primary placeholder:text-brand-secondary/50 focus:border-brand-accent focus:outline-none"
                />
              </div>
            </div>
            {formError && (
              <p className="mt-[var(--spacing-xs)] text-[12px] text-red-600">{formError}</p>
            )}
            {createModel.error && (
              <p className="mt-[var(--spacing-xs)] text-[12px] text-red-600">
                Failed to register model: {createModel.error.message}
              </p>
            )}
            <div className="mt-[var(--spacing-md)] flex gap-[var(--spacing-sm)]">
              <button
                onClick={() => {
                  const { apiModelId, evaluationType, version } = formData;
                  if (!apiModelId || !version.trim()) {
                    setFormError('Please select a model and provide a version label.');
                    return;
                  }
                  const selectedModel = availableModels.find((m) => m.id === apiModelId);
                  createModel.mutate(
                    {
                      apiModelId,
                      evaluationType,
                      version: version.trim(),
                      name: selectedModel?.displayName,
                    },
                    {
                      onSuccess: () => {
                        clearForm();
                        setShowForm(false);
                      },
                    },
                  );
                }}
                disabled={createModel.isPending}
                className="rounded-[var(--radius-md)] bg-brand-accent px-[var(--spacing-lg)] py-[var(--spacing-sm)] text-[13px] font-medium text-white hover:bg-brand-accent/90 disabled:opacity-50"
              >
                {createModel.isPending ? 'Registering...' : 'Register'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  clearForm();
                }}
                disabled={createModel.isPending}
                className="rounded-[var(--radius-md)] border border-surface-border px-[var(--spacing-lg)] py-[var(--spacing-sm)] text-[13px] text-brand-secondary hover:bg-surface-base"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

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

      <div className="mt-[var(--spacing-lg)]">
        <AgreementRateCard rates={rates} isLoading={ratesLoading} />
      </div>
    </div>
  );
}

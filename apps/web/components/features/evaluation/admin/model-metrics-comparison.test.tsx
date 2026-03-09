import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { EvaluationModelMetricsDto } from '@edin/shared';
import { ModelMetricsComparison } from './model-metrics-comparison';

const mockMetrics: EvaluationModelMetricsDto = {
  modelId: 'model-1',
  modelName: 'GPT-4o Evaluator',
  modelVersion: '1.2.0',
  evaluationCount: 142,
  averageScore: 78.3,
  scoreVariance: 12.5,
  humanAgreementRate: 0.87,
};

describe('ModelMetricsComparison', () => {
  it('shows placeholder when metrics is null', () => {
    render(<ModelMetricsComparison metrics={null} isLoading={false} />);

    expect(screen.getByText('Select a model to view performance metrics.')).toBeInTheDocument();
  });

  it('shows loading skeleton when isLoading is true', () => {
    const { container } = render(<ModelMetricsComparison metrics={null} isLoading={true} />);

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders metric cards with model data', () => {
    render(<ModelMetricsComparison metrics={mockMetrics} isLoading={false} />);

    // Heading with model name and version
    expect(screen.getByText('GPT-4o Evaluator — 1.2.0')).toBeInTheDocument();

    // Metric labels
    expect(screen.getByText('Evaluations')).toBeInTheDocument();
    expect(screen.getByText('Average Score')).toBeInTheDocument();
    expect(screen.getByText('Score Variance')).toBeInTheDocument();

    // Metric values
    expect(screen.getByText('142')).toBeInTheDocument();
    expect(screen.getByText('78.3')).toBeInTheDocument();
    expect(screen.getByText('12.5')).toBeInTheDocument();
  });

  it('renders em dashes when averageScore and scoreVariance are null', () => {
    const metricsWithNulls: EvaluationModelMetricsDto = {
      ...mockMetrics,
      averageScore: null,
      scoreVariance: null,
    };

    render(<ModelMetricsComparison metrics={metricsWithNulls} isLoading={false} />);

    // Two em dashes for null averageScore and null scoreVariance
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBe(2);
  });
});

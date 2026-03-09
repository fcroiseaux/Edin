import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EvaluationModelVersionDto } from '@edin/shared';
import { ModelRegistryList } from './model-registry-list';

const mockModels: EvaluationModelVersionDto[] = [
  {
    id: 'model-1',
    name: 'GPT-4o Evaluator',
    version: '1.2.0',
    provider: 'OpenAI',
    status: 'ACTIVE',
    configHash: 'abc123',
    deployedAt: '2026-01-15T10:00:00.000Z',
    retiredAt: null,
    evaluationCount: 142,
    createdAt: '2026-01-10T08:00:00.000Z',
  },
  {
    id: 'model-2',
    name: 'Claude Scorer',
    version: '2.0.1',
    provider: 'Anthropic',
    status: 'DEPRECATED',
    configHash: 'def456',
    deployedAt: null,
    retiredAt: null,
    evaluationCount: 58,
    createdAt: '2025-12-01T08:00:00.000Z',
  },
];

describe('ModelRegistryList', () => {
  it('renders empty state when models array is empty', () => {
    render(<ModelRegistryList models={[]} onSelectModel={vi.fn()} selectedModelId={null} />);

    expect(screen.getByText('No evaluation models registered yet.')).toBeInTheDocument();
  });

  it('renders a table with model data', () => {
    render(
      <ModelRegistryList models={mockModels} onSelectModel={vi.fn()} selectedModelId={null} />,
    );

    // Column headers
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Version')).toBeInTheDocument();
    expect(screen.getByText('Provider')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Evaluations')).toBeInTheDocument();
    expect(screen.getByText('Deployed')).toBeInTheDocument();

    // First model data
    expect(screen.getByText('GPT-4o Evaluator')).toBeInTheDocument();
    expect(screen.getByText('1.2.0')).toBeInTheDocument();
    expect(screen.getByText('OpenAI')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('142')).toBeInTheDocument();
    expect(
      screen.getByText(new Date('2026-01-15T10:00:00.000Z').toLocaleDateString()),
    ).toBeInTheDocument();

    // Second model data
    expect(screen.getByText('Claude Scorer')).toBeInTheDocument();
    expect(screen.getByText('2.0.1')).toBeInTheDocument();
    expect(screen.getByText('Anthropic')).toBeInTheDocument();
    expect(screen.getByText('DEPRECATED')).toBeInTheDocument();
    expect(screen.getByText('58')).toBeInTheDocument();
    // deployedAt is null → em dash
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('calls onSelectModel when a row is clicked', async () => {
    const user = userEvent.setup();
    const onSelectModel = vi.fn();

    render(
      <ModelRegistryList
        models={mockModels}
        onSelectModel={onSelectModel}
        selectedModelId={null}
      />,
    );

    await user.click(screen.getByText('GPT-4o Evaluator'));
    expect(onSelectModel).toHaveBeenCalledWith('model-1');

    await user.click(screen.getByText('Claude Scorer'));
    expect(onSelectModel).toHaveBeenCalledWith('model-2');
  });

  it('highlights the selected row', () => {
    const { container } = render(
      <ModelRegistryList models={mockModels} onSelectModel={vi.fn()} selectedModelId="model-1" />,
    );

    const rows = container.querySelectorAll('tbody tr');
    expect(rows[0].className).toContain('bg-brand-accent/5');
    expect(rows[1].className).not.toContain('bg-brand-accent/5');
  });
});

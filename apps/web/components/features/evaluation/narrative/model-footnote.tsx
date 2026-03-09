import type { EvaluationModelInfoDto } from '@edin/shared';

interface ModelFootnoteProps {
  model: EvaluationModelInfoDto | null;
}

export function ModelFootnote({ model }: ModelFootnoteProps) {
  if (!model) return null;

  return (
    <p className="font-sans text-[12px] text-brand-secondary">
      Evaluated by{' '}
      <span className="font-mono">
        {model.name} {model.version}
      </span>{' '}
      ({model.provider})
    </p>
  );
}

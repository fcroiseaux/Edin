import type { EvaluationScoringWeights } from '../types/evaluation.types.js';

export const DEFAULT_CODE_WEIGHTS: EvaluationScoringWeights = {
  complexity: 0.2,
  maintainability: 0.35,
  testCoverage: 0.25,
  standardsAdherence: 0.2,
};

export const DEFAULT_DOC_WEIGHTS: EvaluationScoringWeights = {
  structuralCompleteness: 0.35,
  readability: 0.35,
  referenceIntegrity: 0.3,
};

export const FORMULA_VERSION = 'v1.0.0';

export const DOC_FORMULA_VERSION = 'v1.0.0';

export const MAX_EVALUATION_FILES = 50;

export const MAX_PATCH_LENGTH = 10000;

export const MAX_DOC_CONTENT_LENGTH = 50000;

export const EVALUATION_CACHE_TTL = 86400;

export function scoreToLabel(score: number): string {
  if (score <= 20) return 'Needs attention';
  if (score <= 40) return 'Developing';
  if (score <= 60) return 'Solid';
  if (score <= 80) return 'Strong';
  return 'Exceptional';
}

const DIMENSION_LABELS: Record<string, string> = {
  complexity: 'Code Complexity',
  maintainability: 'Maintainability',
  testCoverage: 'Test Coverage',
  standardsAdherence: 'Standards Adherence',
  structuralCompleteness: 'Structural Completeness',
  readability: 'Readability',
  referenceIntegrity: 'Reference Integrity',
};

export function dimensionKeyToLabel(key: string): string {
  return DIMENSION_LABELS[key] ?? key;
}

export function getNarrativePreview(narrative: string | null): string {
  if (!narrative) return '';
  const match = narrative.match(/^[^.!?]*[.!?]/);
  return match ? match[0].trim() : narrative.slice(0, 150);
}

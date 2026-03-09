export type EvaluationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export type EvaluationModelStatus = 'ACTIVE' | 'DEPRECATED' | 'RETIRED';

export type EvaluationDimensionKey =
  | 'complexity'
  | 'maintainability'
  | 'testCoverage'
  | 'standardsAdherence';

export interface EvaluationDimensionScoreDto {
  score: number;
  explanation: string;
}

export type EvaluationDimensionScoresDto = Record<
  EvaluationDimensionKey,
  EvaluationDimensionScoreDto
>;

export interface EvaluationDto {
  id: string;
  contributionId: string;
  contributorId: string;
  modelId: string | null;
  status: EvaluationStatus;
  compositeScore: number | null;
  dimensionScores: EvaluationDimensionScoresDto | null;
  narrative: string | null;
  formulaVersion: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationWithContributionDto extends EvaluationDto {
  contribution: {
    id: string;
    title: string;
    contributionType: string;
    sourceRef: string;
  };
}

export interface EvaluationModelDto {
  id: string;
  name: string;
  version: string;
  provider: string;
  status: EvaluationModelStatus;
  createdAt: string;
}

export interface EvaluationDispatchJobDto {
  contributionId: string;
  contributionType: string;
  contributorId: string;
  correlationId: string;
}

export interface EvaluationCompletedEvent {
  eventType: 'evaluation.score.completed';
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    evaluationId: string;
    contributionId: string;
    contributorId: string;
    contributionTitle: string;
    contributionType: string;
    compositeScore: number;
    domain: string | null;
  };
}

export interface EvaluationFailedEvent {
  eventType: 'evaluation.score.failed';
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    evaluationId: string;
    contributionId: string;
    contributorId: string;
    reason: string;
  };
}

export type DocEvaluationDimensionKey =
  | 'structuralCompleteness'
  | 'readability'
  | 'referenceIntegrity';

export type AllEvaluationDimensionKey = EvaluationDimensionKey | DocEvaluationDimensionKey;

export type EvaluationScoringWeights = Record<string, number>;

export interface EvaluationRubricDto {
  id: string;
  evaluationType: string;
  documentType: string | null;
  parameters: EvaluationRubricParameters;
  version: string;
  isActive: boolean;
  createdAt: string;
}

export interface EvaluationRubricParameters {
  targetFleschKincaidRange?: { min: number; max: number };
  requiredSections?: string[];
  maxSentenceLength?: number;
  maxParagraphLength?: number;
}

export interface EvaluationModelVersionDto {
  id: string;
  name: string;
  version: string;
  provider: string;
  status: EvaluationModelStatus;
  configHash: string | null;
  deployedAt: string | null;
  retiredAt: string | null;
  evaluationCount: number;
  createdAt: string;
}

export interface EvaluationModelMetricsDto {
  modelId: string;
  modelName: string;
  modelVersion: string;
  evaluationCount: number;
  averageScore: number | null;
  scoreVariance: number | null;
  humanAgreementRate: number | null;
}

export interface EvaluationProvenanceDto {
  formulaVersion: string;
  weights: EvaluationScoringWeights;
  taskComplexityMultiplier: number;
  domainNormalizationFactor: number;
  modelPromptVersion: string;
  inputTokenCount?: number;
  outputTokenCount?: number;
}

export interface EvaluationModelInfoDto {
  name: string;
  version: string;
  provider: string;
}

export interface EvaluationRubricInfoDto {
  version: string;
  parameters: Record<string, unknown>;
}

export interface EvaluationDetailDto extends EvaluationWithContributionDto {
  model: EvaluationModelInfoDto | null;
  provenance: EvaluationProvenanceDto | null;
  rubric: EvaluationRubricInfoDto | null;
}

export interface EvaluationHistoryItemDto {
  id: string;
  compositeScore: number;
  contributionType: string;
  contributionTitle: string;
  narrativePreview: string;
  completedAt: string;
}

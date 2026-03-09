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

// ─── Human Review & Benchmarking (Story 7-4) ───────────────────────────────

export type EvaluationReviewStatus = 'PENDING' | 'CONFIRMED' | 'OVERRIDDEN';

export interface EvaluationReviewDto {
  id: string;
  evaluationId: string;
  contributorId: string;
  reviewerId: string | null;
  status: EvaluationReviewStatus;
  flagReason: string;
  reviewReason: string | null;
  originalScores: {
    compositeScore: number;
    dimensionScores: Record<string, EvaluationDimensionScoreDto>;
  };
  overrideScores: {
    compositeScore: number;
    dimensionScores: Record<string, EvaluationDimensionScoreDto>;
  } | null;
  overrideNarrative: string | null;
  flaggedAt: string;
  resolvedAt: string | null;
}

export interface EvaluationReviewQueueItemDto {
  id: string;
  evaluationId: string;
  contributorName: string;
  contributionTitle: string;
  domain: string | null;
  originalScore: number;
  flagReason: string;
  flaggedAt: string;
  status: EvaluationReviewStatus;
}

export interface EvaluationReviewDetailDto extends EvaluationReviewDto {
  contributorName: string;
  evaluation: {
    id: string;
    narrative: string | null;
    dimensionScores: Record<string, EvaluationDimensionScoreDto> | null;
    compositeScore: number | null;
    model: EvaluationModelInfoDto | null;
    contribution: {
      id: string;
      title: string;
      contributionType: string;
      sourceRef: string;
    };
  };
}

export interface AgreementRateDto {
  totalReviewed: number;
  confirmed: number;
  overridden: number;
  agreementRate: number;
}

export interface AgreementRatesResponseDto {
  overall: AgreementRateDto;
  byModel: Array<AgreementRateDto & { modelId: string; modelVersion: string }>;
  byDomain: Array<AgreementRateDto & { domain: string }>;
}

export interface EvaluationReviewFlaggedEvent {
  eventType: 'evaluation.review.flagged';
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    reviewId: string;
    evaluationId: string;
    contributionId: string;
    contributorId: string;
    contributionTitle: string;
    flagReason: string;
  };
}

export interface EvaluationReviewResolvedEvent {
  eventType: 'evaluation.review.resolved';
  timestamp: string;
  correlationId: string;
  actorId: string;
  payload: {
    reviewId: string;
    evaluationId: string;
    contributorId: string;
    contributionTitle: string;
    action: 'confirm' | 'override';
    reviewerId: string;
  };
}

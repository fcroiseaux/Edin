// ─── Reward Scoring Types (Story 9-1) ────────────────────────────────────────

export type TemporalHorizon = 'SESSION' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export type ScoreTrend = 'RISING' | 'STABLE' | 'DECLINING';

export interface ScoringFormulaVersionDto {
  id: string;
  version: number;
  aiEvalWeight: number;
  peerFeedbackWeight: number;
  complexityWeight: number;
  domainNormWeight: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdBy: string;
  createdAt: string;
}

export interface ContributionScoreDto {
  id: string;
  contributionId: string;
  contributorId: string;
  compositeScore: number;
  aiEvalScore: number;
  peerFeedbackScore: number | null;
  complexityMultiplier: number;
  domainNormFactor: number;
  formulaVersionId: string;
  createdAt: string;
}

export interface ContributionScoreWithProvenanceDto extends ContributionScoreDto {
  formulaVersion: ScoringFormulaVersionDto;
}

export interface TemporalScoreAggregateDto {
  id: string;
  contributorId: string;
  horizon: TemporalHorizon;
  periodStart: string;
  periodEnd: string;
  aggregatedScore: number;
  contributionCount: number;
  trend: ScoreTrend;
  computedAt: string;
}

export interface ContributorScoresSummaryDto {
  latestSessionScore: ContributionScoreWithProvenanceDto | null;
  monthlyAggregate: TemporalScoreAggregateDto | null;
  aggregates: TemporalScoreAggregateDto[];
  recentScores: ContributionScoreWithProvenanceDto[];
}

export interface CreateFormulaVersionInput {
  aiEvalWeight: number;
  peerFeedbackWeight: number;
  complexityWeight: number;
  domainNormWeight: number;
  metadata?: Record<string, unknown>;
}

// ─── Reward Trajectory Types (Story 9-2) ────────────────────────────────────

export type TrajectoryTimeRange = '30d' | 'quarter' | 'year' | 'all';

export interface TrajectoryPointDto {
  date: string;
  rawScore: number;
  compoundingMultiplier: number;
  compoundedScore: number;
  contributionCount: number;
  trend: ScoreTrend;
  isProjected: boolean;
}

export interface TrajectorySummaryDto {
  currentMultiplier: number;
  tenureMonths: number;
  overallTrend: ScoreTrend;
  totalContributions: number;
}

export interface TrajectoryResponseDto {
  points: TrajectoryPointDto[];
  summary: TrajectorySummaryDto;
  projected: TrajectoryPointDto[];
}

// ─── Reward Methodology Types (Story 9-3) ─────────────────────────────────

export interface CalculatorInput {
  monthlyContributions: number;
  avgQualityScore: number;
  months: number;
  domain?: string;
}

export interface CalculatorProjectedPoint {
  month: number;
  rawScore: number;
  compoundingMultiplier: number;
  compoundedScore: number;
  cumulativeRewardUnits: number;
}

export interface CalculatorResultSummary {
  totalContributions: number;
  finalMultiplier: number;
  totalRewardUnits: number;
  compoundingEffect: string;
}

export interface CalculatorResult {
  projectedPoints: CalculatorProjectedPoint[];
  summary: CalculatorResultSummary;
}

// ─── Reward Score Events ─────────────────────────────────────────────────────

export interface RewardScoreCalculatedEvent {
  eventType: 'reward.score.calculated';
  timestamp: string;
  correlationId: string;
  payload: {
    contributionScoreId: string;
    contributionId: string;
    contributorId: string;
    compositeScore: number;
    domain: string | null;
  };
}

export interface RewardScoreAggregatedEvent {
  eventType: 'reward.score.aggregated';
  timestamp: string;
  correlationId: string;
  payload: {
    contributorId: string;
    horizon: TemporalHorizon;
    aggregatedScore: number;
    contributionCount: number;
    trend: ScoreTrend;
  };
}

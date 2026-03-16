import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { ZenhubConfigService } from '../../zenhub/zenhub-config.service.js';
import { CONFIDENCE_SPRINT_THRESHOLD } from '@edin/shared';
import type {
  PlanningReliabilityScore,
  CombinedEvaluationResult,
  EvaluationCompletedEvent,
} from '@edin/shared';

@Injectable()
export class CombinedEvaluationService {
  private readonly logger = new Logger(CombinedEvaluationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly zenhubConfigService: ZenhubConfigService,
  ) {}

  /**
   * Compute an aggregate planning reliability score (0–100) for a contributor
   * based on their PlanningReliability records across sprints.
   *
   * Score breakdown:
   * - deliveryRatioScore (40%): avg(deliveryRatio) × 100
   * - estimationAccuracyScore (35%): 100 − avg(estimationVariance)
   * - consistencyScore (25%): 100 − stddev(deliveryRatios) × 100
   *
   * Returns null if no planning reliability data exists.
   */
  async computePlanningReliabilityScore(
    contributorId: string,
  ): Promise<PlanningReliabilityScore | null> {
    const records = await this.prisma.planningReliability.findMany({
      where: { contributorId },
      orderBy: { createdAt: 'desc' },
    });

    if (records.length === 0) {
      return null;
    }

    const ratios = records.filter((r) => r.deliveryRatio !== null).map((r) => r.deliveryRatio!);

    const variances = records
      .filter((r) => r.estimationVariance !== null)
      .map((r) => r.estimationVariance!);

    // Delivery ratio score: avg × 100, clamped 0–100
    const avgDeliveryRatio =
      ratios.length > 0 ? ratios.reduce((sum, r) => sum + r, 0) / ratios.length : 0;
    const deliveryRatioScore = Math.max(0, Math.min(100, avgDeliveryRatio * 100));

    // Estimation accuracy score: 100 − avg(variance), clamped 0–100
    const avgVariance =
      variances.length > 0 ? variances.reduce((sum, v) => sum + v, 0) / variances.length : 0;
    const estimationAccuracyScore = Math.max(0, Math.min(100, 100 - avgVariance));

    // Consistency score: based on stddev of delivery ratios
    let consistencyScore = 100;
    if (ratios.length >= 2) {
      const mean = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
      const variance = ratios.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ratios.length;
      const stddev = Math.sqrt(variance);
      consistencyScore = Math.max(0, Math.min(100, 100 - stddev * 100));
    }

    // Weighted aggregate
    const score = Math.round(
      0.4 * deliveryRatioScore + 0.35 * estimationAccuracyScore + 0.25 * consistencyScore,
    );

    const sprintCount = records.length;
    const confidenceFactor = Math.min(sprintCount / CONFIDENCE_SPRINT_THRESHOLD, 1.0);

    return {
      score: Math.max(0, Math.min(100, score)),
      deliveryRatioScore: Math.round(deliveryRatioScore * 100) / 100,
      estimationAccuracyScore: Math.round(estimationAccuracyScore * 100) / 100,
      consistencyScore: Math.round(consistencyScore * 100) / 100,
      sprintCount,
      confidenceFactor: Math.round(confidenceFactor * 1000) / 1000,
    };
  }

  /**
   * Compute combined evaluation score for an evaluation.
   * Merges quality (compositeScore) with planning reliability using configurable weights.
   * Applies confidence-adjusted weights for sparse data.
   *
   * Returns null if feature flag is disabled, evaluation not found, or no planning data.
   */
  async computeCombinedScore(evaluationId: string): Promise<CombinedEvaluationResult | null> {
    const enabled = await this.zenhubConfigService.resolveCombinedScoreEnabled();
    if (!enabled) {
      return null;
    }

    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id: evaluationId },
      select: {
        compositeScore: true,
        contributorId: true,
        status: true,
      },
    });

    if (!evaluation || evaluation.status !== 'COMPLETED' || !evaluation.compositeScore) {
      return null;
    }

    const qualityScore = (
      evaluation.compositeScore as unknown as { toNumber: () => number }
    ).toNumber();

    const reliabilityScore = await this.computePlanningReliabilityScore(evaluation.contributorId);

    if (!reliabilityScore) {
      return {
        qualityScore,
        planningReliabilityScore: 0,
        combinedScore: qualityScore,
        weights: {
          quality: await this.zenhubConfigService.resolveQualityWeight(),
          planning: await this.zenhubConfigService.resolvePlanningWeight(),
        },
        effectiveWeights: { quality: 1.0, planning: 0 },
        sprintCount: 0,
        confidenceFactor: 0,
        planningReliabilityIncluded: false,
      };
    }

    const [configQualityWeight, configPlanningWeight] = await Promise.all([
      this.zenhubConfigService.resolveQualityWeight(),
      this.zenhubConfigService.resolvePlanningWeight(),
    ]);

    const effectivePlanningWeight = configPlanningWeight * reliabilityScore.confidenceFactor;
    const effectiveQualityWeight = 1 - effectivePlanningWeight;

    const combinedScore = Math.round(
      effectiveQualityWeight * qualityScore + effectivePlanningWeight * reliabilityScore.score,
    );

    return {
      qualityScore,
      planningReliabilityScore: reliabilityScore.score,
      combinedScore: Math.max(0, Math.min(100, combinedScore)),
      weights: { quality: configQualityWeight, planning: configPlanningWeight },
      effectiveWeights: {
        quality: Math.round(effectiveQualityWeight * 1000) / 1000,
        planning: Math.round(effectivePlanningWeight * 1000) / 1000,
      },
      sprintCount: reliabilityScore.sprintCount,
      confidenceFactor: reliabilityScore.confidenceFactor,
      planningReliabilityIncluded: true,
    };
  }

  /**
   * Retrieve combined evaluation data from an evaluation's metadata.
   * Returns null if no combined score was computed.
   */
  async getCombinedEvaluation(evaluationId: string): Promise<CombinedEvaluationResult | null> {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id: evaluationId },
      select: { metadata: true },
    });

    if (!evaluation?.metadata) {
      return null;
    }

    const meta = evaluation.metadata as Record<string, unknown>;
    const combined = meta.combinedEvaluation as CombinedEvaluationResult | undefined;
    return combined ?? null;
  }

  /**
   * Event listener: automatically compute combined score when an evaluation completes.
   * Stores the result in the evaluation's metadata JSON for persistence and audit.
   */
  @OnEvent('evaluation.score.completed')
  async handleEvaluationCompleted(event: EvaluationCompletedEvent): Promise<void> {
    const { evaluationId, contributorId } = event.payload;

    try {
      const enabled = await this.zenhubConfigService.resolveCombinedScoreEnabled();
      if (!enabled) {
        return;
      }

      const combinedResult = await this.computeCombinedScore(evaluationId);
      if (!combinedResult) {
        return;
      }

      // Merge combined evaluation data into existing metadata
      const evaluation = await this.prisma.evaluation.findUnique({
        where: { id: evaluationId },
        select: { metadata: true },
      });

      const existingMeta = (evaluation?.metadata as Record<string, unknown>) ?? {};

      await this.prisma.evaluation.update({
        where: { id: evaluationId },
        data: {
          metadata: {
            ...existingMeta,
            combinedEvaluation: combinedResult,
          },
        },
      });

      this.logger.log('Combined evaluation score computed and stored', {
        module: 'evaluation',
        evaluationId,
        contributorId,
        qualityScore: combinedResult.qualityScore,
        planningReliabilityScore: combinedResult.planningReliabilityScore,
        combinedScore: combinedResult.combinedScore,
        confidenceFactor: combinedResult.confidenceFactor,
        planningReliabilityIncluded: combinedResult.planningReliabilityIncluded,
      });
    } catch (error) {
      this.logger.warn('Failed to compute combined evaluation score — quality score unaffected', {
        module: 'evaluation',
        evaluationId,
        contributorId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

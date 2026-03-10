import { Injectable, Logger } from '@nestjs/common';
import { REWARD_METHODOLOGY } from '@edin/shared';
import type { CalculatorInput, CalculatorProjectedPoint, CalculatorResult } from '@edin/shared';

const MAX_MONTHLY_CONTRIBUTIONS = 50;

@Injectable()
export class MethodologyService {
  private readonly logger = new Logger(MethodologyService.name);

  /**
   * Compute a projected trajectory from hypothetical calculator inputs.
   * Uses the same interpolation logic as TrajectoryService.
   */
  calculate(input: CalculatorInput): CalculatorResult {
    const { monthlyContributions, avgQualityScore, months } = input;

    const projectedPoints: CalculatorProjectedPoint[] = [];
    let cumulativeRewardUnits = 0;

    for (let month = 1; month <= months; month++) {
      const rawScore =
        (avgQualityScore * Math.min(monthlyContributions, MAX_MONTHLY_CONTRIBUTIONS)) /
        MAX_MONTHLY_CONTRIBUTIONS;
      const multiplier = this.interpolateMultiplier(month);
      const compoundedScore = rawScore * multiplier;
      cumulativeRewardUnits += compoundedScore;

      projectedPoints.push({
        month,
        rawScore: Math.round(rawScore * 100) / 100,
        compoundingMultiplier: Math.round(multiplier * 100) / 100,
        compoundedScore: Math.round(compoundedScore * 100) / 100,
        cumulativeRewardUnits: Math.round(cumulativeRewardUnits * 100) / 100,
      });
    }

    // Compounding effect: compare actual cumulative vs. what linear (1.0x) would give
    const linearTotal = projectedPoints.reduce((sum, p) => sum + p.rawScore, 0);
    const compoundingRatio = linearTotal > 0 ? cumulativeRewardUnits / linearTotal : 1;

    const summary = {
      totalContributions: monthlyContributions * months,
      finalMultiplier:
        projectedPoints.length > 0
          ? projectedPoints[projectedPoints.length - 1].compoundingMultiplier
          : 1,
      totalRewardUnits: Math.round(cumulativeRewardUnits * 100) / 100,
      compoundingEffect: `${Math.round(compoundingRatio * 10) / 10}x more than linear`,
    };

    this.logger.debug('Methodology calculation completed', {
      module: 'reward',
      months,
      monthlyContributions,
      avgQualityScore,
      totalRewardUnits: summary.totalRewardUnits,
    });

    return { projectedPoints, summary };
  }

  /**
   * Interpolate compounding multiplier from REWARD_METHODOLOGY.scalingCurve.
   * Same logic as TrajectoryService.interpolateMultiplier.
   */
  interpolateMultiplier(tenureMonths: number): number {
    const curve = REWARD_METHODOLOGY.scalingCurve;

    if (tenureMonths <= 0) return 1.0;
    if (tenureMonths >= curve[curve.length - 1].month) {
      return curve[curve.length - 1].multiplier;
    }

    for (let i = 0; i < curve.length - 1; i++) {
      const lower = curve[i];
      const upper = curve[i + 1];
      if (tenureMonths >= lower.month && tenureMonths <= upper.month) {
        const ratio = (tenureMonths - lower.month) / (upper.month - lower.month);
        return lower.multiplier + ratio * (upper.multiplier - lower.multiplier);
      }
    }

    return 1.0;
  }
}

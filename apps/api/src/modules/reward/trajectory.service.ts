import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { REWARD_METHODOLOGY } from '@edin/shared';
import type {
  TrajectoryPointDto,
  TrajectorySummaryDto,
  TrajectoryResponseDto,
  TrajectoryTimeRange,
  TemporalHorizon,
  ScoreTrend,
} from '@edin/shared';

@Injectable()
export class TrajectoryService {
  private readonly logger = new Logger(TrajectoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get trajectory data for a contributor across a time range.
   */
  async getTrajectory(
    contributorId: string,
    timeRange: TrajectoryTimeRange = 'year',
    cursor?: string,
    limit = 50,
  ): Promise<TrajectoryResponseDto & { hasMore: boolean; nextCursor: string | null }> {
    const horizon = this.getHorizonForTimeRange(timeRange);
    const since = this.getStartDateForTimeRange(timeRange);
    const clampedLimit = Math.min(Math.max(limit, 1), 200);

    // Get contributor's first contribution date for tenure calculation
    const firstScore = await this.prisma.contributionScore.findFirst({
      where: { contributorId },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    const firstContributionDate = firstScore?.createdAt ?? new Date();

    // Fetch temporal aggregates for the selected horizon
    const whereClause: Record<string, unknown> = {
      contributorId,
      horizon: horizon as never,
      periodStart: { gte: since },
    };
    if (cursor) {
      (whereClause.periodStart as Record<string, unknown>).gt = new Date(cursor);
    }

    const aggregates = await this.prisma.temporalScoreAggregate.findMany({
      where: whereClause,
      orderBy: { periodStart: 'asc' },
      take: clampedLimit + 1,
    });

    const hasMore = aggregates.length > clampedLimit;
    const items = hasMore ? aggregates.slice(0, clampedLimit) : aggregates;

    // Compute trajectory points with compounding multiplier
    const points: TrajectoryPointDto[] = items.map((agg) => {
      const tenureMonths = this.calculateTenureMonths(firstContributionDate, agg.periodStart);
      const multiplier = this.interpolateMultiplier(tenureMonths);
      const rawScore = Number(agg.aggregatedScore);

      return {
        date: agg.periodStart.toISOString(),
        rawScore,
        compoundingMultiplier: Math.round(multiplier * 100) / 100,
        compoundedScore: Math.round(rawScore * multiplier * 100) / 100,
        contributionCount: agg.contributionCount,
        trend: agg.trend as ScoreTrend,
        isProjected: false,
      };
    });

    // Compute projected trajectory
    const projected = this.computeProjectedTrajectory(points, firstContributionDate, horizon);

    // Compute summary
    const currentTenureMonths = this.calculateTenureMonths(firstContributionDate, new Date());
    const totalContributions = points.reduce((sum, p) => sum + p.contributionCount, 0);
    const overallTrend = this.determineOverallTrend(points);

    const summary: TrajectorySummaryDto = {
      currentMultiplier: Math.round(this.interpolateMultiplier(currentTenureMonths) * 100) / 100,
      tenureMonths: Math.round(currentTenureMonths * 10) / 10,
      overallTrend,
      totalContributions,
    };

    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1].periodStart.toISOString() : null;

    this.logger.log('Trajectory computed', {
      module: 'reward',
      contributorId,
      timeRange,
      pointCount: points.length,
      projectedCount: projected.length,
    });

    return { points, summary, projected, hasMore, nextCursor };
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  getHorizonForTimeRange(timeRange: TrajectoryTimeRange): TemporalHorizon {
    switch (timeRange) {
      case '30d':
        return 'DAILY';
      case 'quarter':
        return 'WEEKLY';
      case 'year':
      case 'all':
        return 'MONTHLY';
    }
  }

  private getStartDateForTimeRange(timeRange: TrajectoryTimeRange): Date {
    const now = new Date();
    switch (timeRange) {
      case '30d':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
      case 'quarter':
        return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      case 'year':
        return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      case 'all':
        return new Date(2020, 0, 1); // Far enough back to include everything
    }
  }

  calculateTenureMonths(firstContribution: Date, currentDate: Date): number {
    const years = currentDate.getFullYear() - firstContribution.getFullYear();
    const months = currentDate.getMonth() - firstContribution.getMonth();
    const days = currentDate.getDate() - firstContribution.getDate();
    return Math.max(0, years * 12 + months + days / 30);
  }

  /**
   * Interpolate compounding multiplier from REWARD_METHODOLOGY.scalingCurve.
   * Linear interpolation between defined points.
   */
  interpolateMultiplier(tenureMonths: number): number {
    const curve = REWARD_METHODOLOGY.scalingCurve;

    if (tenureMonths <= 0) return 1.0;
    if (tenureMonths >= curve[curve.length - 1].month) {
      return curve[curve.length - 1].multiplier;
    }

    // Find bracketing points
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

  private computeProjectedTrajectory(
    existingPoints: TrajectoryPointDto[],
    firstContribution: Date,
    horizon: TemporalHorizon,
  ): TrajectoryPointDto[] {
    if (existingPoints.length < 2) return [];

    // Use last 3 periods to compute average
    const recentPoints = existingPoints.slice(-3);
    const avgScore = recentPoints.reduce((sum, p) => sum + p.rawScore, 0) / recentPoints.length;
    const avgContributions = Math.round(
      recentPoints.reduce((sum, p) => sum + p.contributionCount, 0) / recentPoints.length,
    );

    const lastDate = new Date(existingPoints[existingPoints.length - 1].date);
    const projected: TrajectoryPointDto[] = [];
    const periodsToProject = horizon === 'DAILY' ? 7 : horizon === 'WEEKLY' ? 4 : 3;

    for (let i = 1; i <= periodsToProject; i++) {
      const futureDate = this.advanceDate(lastDate, horizon, i);
      const tenureMonths = this.calculateTenureMonths(firstContribution, futureDate);
      const multiplier = this.interpolateMultiplier(tenureMonths);

      projected.push({
        date: futureDate.toISOString(),
        rawScore: Math.round(avgScore * 100) / 100,
        compoundingMultiplier: Math.round(multiplier * 100) / 100,
        compoundedScore: Math.round(avgScore * multiplier * 100) / 100,
        contributionCount: avgContributions,
        trend: 'STABLE',
        isProjected: true,
      });
    }

    return projected;
  }

  private advanceDate(base: Date, horizon: TemporalHorizon, periods: number): Date {
    const d = new Date(base);
    switch (horizon) {
      case 'DAILY':
      case 'SESSION':
        d.setDate(d.getDate() + periods);
        break;
      case 'WEEKLY':
        d.setDate(d.getDate() + 7 * periods);
        break;
      case 'MONTHLY':
        d.setMonth(d.getMonth() + periods);
        break;
      case 'QUARTERLY':
        d.setMonth(d.getMonth() + 3 * periods);
        break;
      case 'YEARLY':
        d.setFullYear(d.getFullYear() + periods);
        break;
    }
    return d;
  }

  private determineOverallTrend(points: TrajectoryPointDto[]): ScoreTrend {
    if (points.length < 2) return 'STABLE';

    const firstHalf = points.slice(0, Math.floor(points.length / 2));
    const secondHalf = points.slice(Math.floor(points.length / 2));

    const firstAvg = firstHalf.reduce((s, p) => s + p.compoundedScore, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((s, p) => s + p.compoundedScore, 0) / secondHalf.length;

    if (firstAvg === 0) return secondAvg > 0 ? 'RISING' : 'STABLE';
    if (secondAvg > firstAvg * 1.05) return 'RISING';
    if (secondAvg < firstAvg * 0.95) return 'DECLINING';
    return 'STABLE';
  }
}

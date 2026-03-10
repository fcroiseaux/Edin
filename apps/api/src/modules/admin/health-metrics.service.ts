import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import type {
  HealthMetrics,
  CommunityVitals,
  MetricCard,
  DomainDistributionMetric,
  KpiMetric,
  MetricTrendPoint,
} from '@edin/shared';
import { KPI_DEFINITIONS } from '@edin/shared';

const CACHE_KEY = 'admin:health-metrics';
const CACHE_TTL_SECONDS = 300; // 5 minutes

@Injectable()
export class HealthMetricsService {
  private readonly logger = new Logger(HealthMetricsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getHealthMetrics(): Promise<HealthMetrics> {
    const cached = await this.redis.get<HealthMetrics>(CACHE_KEY);
    if (cached) {
      this.logger.debug('Returning cached health metrics');
      return cached;
    }

    this.logger.log('Aggregating health metrics from database');
    const metrics = await this.aggregateMetrics();
    await this.redis.set(CACHE_KEY, metrics, CACHE_TTL_SECONDS);
    return metrics;
  }

  private async aggregateMetrics(): Promise<HealthMetrics> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      activeCount,
      ,
      // activeCountThirtyDaysAgo - reserved for future retention calculation
      domainGroups,
      retentionData,
      feedbackTurnaround,
      contributionFrequencyData,
      evaluationStats,
      publicationCount,
      avgScore,
      applicationCount,
      articleSubmissionCount,
      editorialTurnaroundData,
      editorConversionData,
      monthlyTrend,
    ] = await Promise.all([
      // Active contributors count
      this.prisma.contributor.count({ where: { isActive: true } }),
      // Active count 30 days ago (contributors created before 30 days ago who were active)
      this.prisma.contributor.count({
        where: { isActive: true, createdAt: { lt: thirtyDaysAgo } },
      }),
      // Domain distribution
      this.prisma.contributor.groupBy({
        by: ['domain'],
        where: { isActive: true, domain: { not: null } },
        _count: true,
      }),
      // Retention: contributors who joined 30-60 days ago and are still active
      this.getRetentionData(thirtyDaysAgo, sixtyDaysAgo),
      // Feedback turnaround (avg hours)
      this.getFeedbackTurnaround(),
      // Contribution frequency (contributions per active contributor in last 7 days)
      this.prisma.contribution.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      // Evaluation stats
      this.prisma.evaluation.groupBy({
        by: ['status'],
        _count: true,
      }),
      // Publication rate (published articles in last 30 days)
      this.prisma.article.count({
        where: { status: 'PUBLISHED', publishedAt: { gte: thirtyDaysAgo } },
      }),
      // Average evaluation score
      this.prisma.evaluation.aggregate({
        where: { status: 'COMPLETED' },
        _avg: { compositeScore: true },
      }),
      // Application rate (applications in last 7 days)
      this.prisma.application.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      // Article submissions in last 7 days
      this.prisma.article.count({
        where: { submittedAt: { gte: sevenDaysAgo } },
      }),
      // Editorial turnaround (avg days from submission to publish/reject)
      this.getEditorialTurnaround(),
      // Editor conversion data
      this.getEditorConversion(),
      // Monthly contributor trend (last 6 months)
      this.getMonthlyActiveTrend(now),
    ]);

    const totalActiveWithDomain = domainGroups.reduce((sum, g) => sum + g._count, 0);
    const domainDistribution: DomainDistributionMetric[] = domainGroups.map((g) => ({
      domain: g.domain ?? 'Unknown',
      count: g._count,
      percentage:
        totalActiveWithDomain > 0 ? Math.round((g._count / totalActiveWithDomain) * 100) : 0,
    }));

    const retentionRate =
      retentionData.joined > 0
        ? Math.round((retentionData.retained / retentionData.joined) * 100)
        : 0;

    const contributionFreqPerContributor =
      activeCount > 0 ? Math.round((contributionFrequencyData / activeCount) * 10) / 10 : 0;

    const totalEvaluations = evaluationStats.reduce((s, e) => s + e._count, 0);
    const completedEvaluations = evaluationStats.find((e) => e.status === 'COMPLETED')?._count ?? 0;
    const evalCompletionRate =
      totalEvaluations > 0 ? Math.round((completedEvaluations / totalEvaluations) * 100) : 0;

    const avgScoreValue = avgScore._avg.compositeScore ? Number(avgScore._avg.compositeScore) : 0;

    const vitals: CommunityVitals = {
      activeContributors: this.buildMetricCard(
        'Active Contributors',
        activeCount,
        'contributors',
        20,
        monthlyTrend,
      ),
      retentionRate: this.buildMetricCard('30-Day Retention', retentionRate, '%', 50, []),
      domainDistribution,
      feedbackTurnaroundHours: this.buildMetricCard(
        'Feedback Turnaround',
        feedbackTurnaround,
        'hours',
        48,
        [],
      ),
      contributionFrequency: this.buildMetricCard(
        'Contribution Frequency',
        contributionFreqPerContributor,
        'contributions/week',
        2,
        [],
      ),
      evaluationCompletionRate: this.buildMetricCard(
        'Evaluation Completion',
        evalCompletionRate,
        '%',
        90,
        [],
      ),
      publicationRate: this.buildMetricCard(
        'Publication Rate',
        publicationCount,
        'articles/month',
        10,
        [],
      ),
      avgEvaluationScore: this.buildMetricCard(
        'Avg Evaluation Score',
        Math.round(avgScoreValue * 10) / 10,
        'score',
        null,
        [],
      ),
    };

    const leadingKpis = this.buildLeadingKpis(
      applicationCount,
      retentionRate,
      contributionFreqPerContributor,
      articleSubmissionCount,
      editorialTurnaroundData,
    );

    const laggingKpis = this.buildLaggingKpis(activeCount, avgScoreValue, editorConversionData);

    return {
      vitals,
      leadingKpis,
      laggingKpis,
      generatedAt: now.toISOString(),
    };
  }

  private buildMetricCard(
    label: string,
    value: number,
    unit: string,
    target: number | null,
    trend: MetricTrendPoint[],
  ): MetricCard {
    return {
      label,
      value,
      unit,
      target,
      trend,
      editorialContext: this.generateEditorialContext(label, value, target),
    };
  }

  private generateEditorialContext(label: string, value: number, target: number | null): string {
    if (target === null) {
      return `${label}: ${value}`;
    }

    // For metrics where lower is better (turnaround time)
    const lowerIsBetter = label.includes('Turnaround');

    if (lowerIsBetter) {
      if (value <= target * 0.8) return `${label} is excellent — ${value} vs ${target} target`;
      if (value <= target) return `${label} is on track — ${value} vs ${target} target`;
      return `${label} needs attention — ${value} exceeds ${target} target`;
    }

    const ratio = value / target;
    if (ratio >= 1.2) return `${label} exceeds target by ${Math.round((ratio - 1) * 100)}%`;
    if (ratio >= 0.8) return `${label} is on track — ${value} vs ${target} target`;
    return `${label} needs attention — ${Math.round((1 - ratio) * 100)}% below target`;
  }

  private async getRetentionData(
    thirtyDaysAgo: Date,
    sixtyDaysAgo: Date,
  ): Promise<{ joined: number; retained: number }> {
    const joined = await this.prisma.contributor.count({
      where: {
        createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        role: { not: 'PUBLIC' },
      },
    });

    const retained = await this.prisma.contributor.count({
      where: {
        createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
        role: { not: 'PUBLIC' },
        isActive: true,
      },
    });

    return { joined, retained };
  }

  private async getFeedbackTurnaround(): Promise<number> {
    const completedFeedback = await this.prisma.peerFeedback.findMany({
      where: { status: 'COMPLETED', submittedAt: { not: null } },
      select: { assignedAt: true, submittedAt: true },
      orderBy: { submittedAt: 'desc' },
      take: 100,
    });

    if (completedFeedback.length === 0) return 0;

    const totalHours = completedFeedback.reduce((sum, fb) => {
      const hours = (fb.submittedAt!.getTime() - fb.assignedAt.getTime()) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);

    return Math.round(totalHours / completedFeedback.length);
  }

  private async getEditorialTurnaround(): Promise<number> {
    const publishedArticles = await this.prisma.article.findMany({
      where: {
        status: 'PUBLISHED',
        submittedAt: { not: null },
        publishedAt: { not: null },
      },
      select: { submittedAt: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    });

    if (publishedArticles.length === 0) return 0;

    const totalDays = publishedArticles.reduce((sum, a) => {
      const days = (a.publishedAt!.getTime() - a.submittedAt!.getTime()) / (1000 * 60 * 60 * 24);
      return sum + days;
    }, 0);

    return Math.round((totalDays / publishedArticles.length) * 10) / 10;
  }

  private async getEditorConversion(): Promise<number> {
    const totalContributors = await this.prisma.contributor.count({
      where: { role: { not: 'PUBLIC' }, isActive: true },
    });

    const editors = await this.prisma.contributor.count({
      where: { role: 'EDITOR', isActive: true },
    });

    if (totalContributors === 0) return 0;
    return Math.round((editors / totalContributors) * 100);
  }

  /**
   * Approximation: counts contributors created up to each month-end who are currently active.
   * Without historical snapshots, this is the best proxy available in Phase 1.
   */
  private async getMonthlyActiveTrend(now: Date): Promise<MetricTrendPoint[]> {
    const points: MetricTrendPoint[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const count = await this.prisma.contributor.count({
        where: {
          isActive: true,
          createdAt: { lte: endDate },
        },
      });

      points.push({
        date: date.toISOString().slice(0, 7),
        value: count,
      });
    }
    return points;
  }

  private buildLeadingKpis(
    applicationCount: number,
    retentionRate: number,
    contributionFreq: number,
    articleSubmissions: number,
    editorialTurnaround: number,
  ): KpiMetric[] {
    return KPI_DEFINITIONS.filter((k) => k.category === 'leading').map((def) => {
      let value: number | null = null;

      switch (def.id) {
        case 'application-rate':
          value = applicationCount;
          break;
        case '30-day-retention':
          value = retentionRate;
          break;
        case 'contribution-frequency':
          value = contributionFreq;
          break;
        case 'cross-domain-engagement':
          value = null; // Requires cross-domain contribution tracking
          break;
        case 'referral-rate':
          value = null; // Not trackable in current schema
          break;
        case 'publication-submission-rate':
          value = articleSubmissions;
          break;
        case 'editorial-turnaround':
          value = editorialTurnaround;
          break;
      }

      return {
        id: def.id,
        label: def.label,
        category: def.category,
        value,
        target: def.target,
        unit: def.unit,
        frequency: def.frequency,
        editorialContext:
          value !== null && def.target !== null
            ? this.generateEditorialContext(def.label, value, def.target)
            : value === null
              ? `${def.label}: Not yet trackable`
              : `${def.label}: ${value} ${def.unit}`,
      };
    });
  }

  private buildLaggingKpis(
    activeCount: number,
    avgScore: number,
    editorConversion: number,
  ): KpiMetric[] {
    return KPI_DEFINITIONS.filter((k) => k.category === 'lagging').map((def) => {
      let value: number | null = null;

      switch (def.id) {
        case 'active-contributor-count':
          value = activeCount;
          break;
        case 'quarterly-retention':
          value = null; // Requires 90-day tracking
          break;
        case 'contribution-quality-trend':
          value = Math.round(avgScore * 10) / 10;
          break;
        case 'publication-external-reach':
          value = null; // Not trackable
          break;
        case 'author-to-editor-conversion':
          value = editorConversion;
          break;
      }

      return {
        id: def.id,
        label: def.label,
        category: def.category,
        value,
        target: def.target,
        unit: def.unit,
        frequency: def.frequency,
        editorialContext:
          value !== null && def.target !== null
            ? this.generateEditorialContext(def.label, value, def.target)
            : value === null
              ? `${def.label}: Not yet trackable`
              : `${def.label}: ${value} ${def.unit}`,
      };
    });
  }
}

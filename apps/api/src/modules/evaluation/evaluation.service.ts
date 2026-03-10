import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { OnEvent } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { AuditService } from '../compliance/audit/audit.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ERROR_CODES, getNarrativePreview, scoreToLabel } from '@edin/shared';
import type {
  EvaluationStatus,
  PublicEvaluationAggregateDto,
  ContributorEvaluationSummaryDto,
} from '@edin/shared';
import { EvaluationReviewService } from './services/evaluation-review.service.js';

interface ContributionIngestedPayload {
  contributionId: string;
  contributionType: string;
  contributorId: string | null;
  repositoryId: string;
  correlationId: string;
}

interface EvaluationQuery {
  cursor?: string;
  limit: number;
  status?: string;
  contributionId?: string;
  contributionType?: string;
  from?: string;
  to?: string;
}

interface EvaluationHistoryQuery {
  cursor?: string;
  limit: number;
  contributionType?: string;
  from?: string;
  to?: string;
}

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  private static readonly PUBLIC_AGGREGATE_CACHE_KEY = 'public:evaluation-aggregate';
  private static readonly PUBLIC_AGGREGATE_CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    @InjectQueue('evaluation-dispatch')
    private readonly dispatchQueue: Queue,
    private readonly reviewService: EvaluationReviewService,
    private readonly auditService: AuditService,
  ) {}

  private isEnabled(): boolean {
    return this.configService.get<string>('EVALUATION_ENABLED', 'true') !== 'false';
  }

  @OnEvent('contribution.commit.ingested')
  async handleCommitIngested(payload: ContributionIngestedPayload): Promise<void> {
    await this.handleContributionIngested(payload);
  }

  @OnEvent('contribution.pull_request.ingested')
  async handlePrIngested(payload: ContributionIngestedPayload): Promise<void> {
    await this.handleContributionIngested(payload);
  }

  @OnEvent('contribution.documentation.ingested')
  async handleDocIngested(payload: ContributionIngestedPayload): Promise<void> {
    await this.handleContributionIngested(payload);
  }

  private async handleContributionIngested(payload: ContributionIngestedPayload): Promise<void> {
    if (!this.isEnabled()) {
      this.logger.debug('Evaluation disabled, skipping dispatch', {
        module: 'evaluation',
        contributionId: payload.contributionId,
      });
      return;
    }

    if (!payload.contributorId) {
      this.logger.debug('Skipping evaluation for unattributed contribution', {
        module: 'evaluation',
        contributionId: payload.contributionId,
      });
      return;
    }

    const contributionType = payload.contributionType;
    const supportedTypes = ['COMMIT', 'PULL_REQUEST', 'DOCUMENTATION'];
    if (!supportedTypes.includes(contributionType)) {
      this.logger.debug('Skipping evaluation for unsupported contribution type', {
        module: 'evaluation',
        contributionId: payload.contributionId,
        contributionType,
      });
      return;
    }

    const existing = await this.prisma.evaluation.findUnique({
      where: { contributionId: payload.contributionId },
    });

    if (existing) {
      this.logger.debug('Evaluation already exists, skipping', {
        module: 'evaluation',
        contributionId: payload.contributionId,
        evaluationId: existing.id,
      });
      return;
    }

    const evaluationId = randomUUID();
    const correlationId = payload.correlationId;

    await this.prisma.$transaction(async (tx) => {
      await tx.evaluation.create({
        data: {
          id: evaluationId,
          contributionId: payload.contributionId,
          contributorId: payload.contributorId!,
          status: 'PENDING',
        },
      });

      await this.auditService.log(
        {
          actorId: null,
          action: 'EVALUATION_DISPATCHED',
          entityType: 'Evaluation',
          entityId: evaluationId,
          correlationId,
          details: {
            contributionId: payload.contributionId,
            contributorId: payload.contributorId,
            contributionType,
          },
        },
        tx,
      );
    });

    await this.dispatchQueue.add(
      'dispatch-evaluation',
      {
        evaluationId,
        contributionId: payload.contributionId,
        contributionType,
        contributorId: payload.contributorId,
        correlationId,
      },
      { jobId: `dispatch-${evaluationId}` },
    );

    this.logger.log('Evaluation dispatched', {
      module: 'evaluation',
      evaluationId,
      contributionId: payload.contributionId,
      correlationId,
    });
  }

  async getEvaluation(evaluationId: string) {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        contribution: {
          select: {
            id: true,
            title: true,
            contributionType: true,
            sourceRef: true,
          },
        },
        model: {
          select: {
            name: true,
            version: true,
            provider: true,
          },
        },
        rubric: {
          select: {
            version: true,
            parameters: true,
          },
        },
      },
    });

    if (!evaluation) {
      throw new DomainException(
        ERROR_CODES.EVALUATION_NOT_FOUND,
        'Evaluation not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.mapEvaluationDetail(evaluation);
  }

  async getEvaluationByContribution(contributionId: string) {
    const cached = await this.redisService.get<{
      evaluationId: string;
      status: string;
      compositeScore: number;
      dimensionScores: unknown;
    }>(`evaluation:${contributionId}`);

    if (cached) {
      const evaluation = await this.prisma.evaluation.findUnique({
        where: { id: cached.evaluationId },
        include: {
          contribution: {
            select: {
              id: true,
              title: true,
              contributionType: true,
              sourceRef: true,
            },
          },
        },
      });

      if (evaluation) {
        return this.mapEvaluationWithContribution(evaluation);
      }
    }

    const evaluation = await this.prisma.evaluation.findUnique({
      where: { contributionId },
      include: {
        contribution: {
          select: {
            id: true,
            title: true,
            contributionType: true,
            sourceRef: true,
          },
        },
      },
    });

    if (!evaluation) {
      return null;
    }

    return this.mapEvaluationWithContribution(evaluation);
  }

  async getEvaluationsForContributor(contributorId: string, query: EvaluationQuery) {
    const { cursor, limit = 20, status, contributionId, contributionType, from, to } = query;

    const where: Record<string, unknown> = { contributorId };
    if (status) {
      where.status = status;
    }
    if (contributionId) {
      where.contributionId = contributionId;
    }
    if (contributionType) {
      where.contribution = { contributionType };
    }
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.gte = new Date(from);
      if (to) dateFilter.lte = new Date(to);
      where.completedAt = dateFilter;
    }

    if (cursor) {
      const separatorIdx = cursor.lastIndexOf('|');
      if (separatorIdx > 0) {
        const cursorDate = cursor.slice(0, separatorIdx);
        const cursorId = cursor.slice(separatorIdx + 1);
        const parsedDate = new Date(cursorDate);
        if (!isNaN(parsedDate.getTime())) {
          where.OR = [
            { createdAt: { lt: parsedDate } },
            { createdAt: parsedDate, id: { lt: cursorId } },
          ];
        }
      }
    }

    const countWhere: Record<string, unknown> = { contributorId };
    if (status) countWhere.status = status;
    if (contributionId) countWhere.contributionId = contributionId;
    if (contributionType) countWhere.contribution = { contributionType };
    if (from || to) {
      const countDateFilter: Record<string, Date> = {};
      if (from) countDateFilter.gte = new Date(from);
      if (to) countDateFilter.lte = new Date(to);
      countWhere.completedAt = countDateFilter;
    }

    const [items, total] = await Promise.all([
      this.prisma.evaluation.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        include: {
          contribution: {
            select: {
              id: true,
              title: true,
              contributionType: true,
              sourceRef: true,
            },
          },
        },
      }),
      this.prisma.evaluation.count({ where: countWhere }),
    ]);

    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;
    const lastItem = resultItems.length > 0 ? resultItems[resultItems.length - 1] : null;
    const nextCursor =
      hasMore && lastItem ? `${lastItem.createdAt.toISOString()}|${lastItem.id}` : null;

    return {
      items: resultItems.map((item) => this.mapEvaluationWithContribution(item)),
      pagination: {
        cursor: nextCursor,
        hasMore,
        total,
      },
    };
  }

  async getEvaluationHistory(contributorId: string, query: EvaluationHistoryQuery) {
    const { cursor, limit = 20, contributionType, from, to } = query;

    const where: Record<string, unknown> = {
      contributorId,
      status: 'COMPLETED',
    };
    if (contributionType) {
      where.contribution = { contributionType };
    }
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.gte = new Date(from);
      if (to) dateFilter.lte = new Date(to);
      where.completedAt = dateFilter;
    }

    if (cursor) {
      const separatorIdx = cursor.lastIndexOf('|');
      if (separatorIdx > 0) {
        const cursorDate = cursor.slice(0, separatorIdx);
        const cursorId = cursor.slice(separatorIdx + 1);
        const parsedDate = new Date(cursorDate);
        if (!isNaN(parsedDate.getTime())) {
          where.OR = [
            { completedAt: { lt: parsedDate } },
            { completedAt: parsedDate, id: { lt: cursorId } },
          ];
        }
      }
    }

    const countWhere: Record<string, unknown> = {
      contributorId,
      status: 'COMPLETED',
    };
    if (contributionType) countWhere.contribution = { contributionType };
    if (from || to) {
      const countDateFilter: Record<string, Date> = {};
      if (from) countDateFilter.gte = new Date(from);
      if (to) countDateFilter.lte = new Date(to);
      countWhere.completedAt = countDateFilter;
    }

    const [items, total] = await Promise.all([
      this.prisma.evaluation.findMany({
        where,
        orderBy: [{ completedAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        select: {
          id: true,
          compositeScore: true,
          narrative: true,
          completedAt: true,
          contribution: {
            select: {
              contributionType: true,
              title: true,
            },
          },
        },
      }),
      this.prisma.evaluation.count({ where: countWhere }),
    ]);

    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;
    const lastItem = resultItems.length > 0 ? resultItems[resultItems.length - 1] : null;
    const nextCursor =
      hasMore && lastItem && lastItem.completedAt
        ? `${lastItem.completedAt.toISOString()}|${lastItem.id}`
        : null;

    return {
      items: resultItems.map((item) => ({
        id: item.id,
        compositeScore:
          (item.compositeScore as unknown as { toNumber: () => number })?.toNumber() ?? 0,
        contributionType: item.contribution.contributionType,
        contributionTitle: item.contribution.title,
        narrativePreview: getNarrativePreview(item.narrative),
        completedAt: item.completedAt?.toISOString() ?? '',
      })),
      pagination: {
        cursor: nextCursor,
        hasMore,
        total,
      },
    };
  }

  async getEvaluationStatus(
    contributionId: string,
  ): Promise<{ status: EvaluationStatus; contributorId: string } | null> {
    const cached = await this.redisService.get<{ status: string; contributorId?: string }>(
      `evaluation:${contributionId}`,
    );

    if (cached?.status) {
      if (cached.contributorId) {
        return { status: cached.status as EvaluationStatus, contributorId: cached.contributorId };
      }
      // Fallback to DB if cache doesn't have contributorId
    }

    const evaluation = await this.prisma.evaluation.findUnique({
      where: { contributionId },
      select: { status: true, contributorId: true },
    });

    if (!evaluation) {
      return null;
    }

    return {
      status: evaluation.status as EvaluationStatus,
      contributorId: evaluation.contributorId,
    };
  }

  private mapEvaluationWithContribution(evaluation: {
    id: string;
    contributionId: string;
    contributorId: string;
    modelId: string | null;
    status: string;
    compositeScore: { toNumber: () => number } | null;
    dimensionScores: unknown;
    narrative: string | null;
    formulaVersion: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    contribution: {
      id: string;
      title: string;
      contributionType: string;
      sourceRef: string;
    };
  }) {
    return {
      id: evaluation.id,
      contributionId: evaluation.contributionId,
      contributorId: evaluation.contributorId,
      modelId: evaluation.modelId,
      status: evaluation.status,
      compositeScore: evaluation.compositeScore?.toNumber() ?? null,
      dimensionScores: evaluation.dimensionScores,
      narrative: evaluation.narrative,
      formulaVersion: evaluation.formulaVersion,
      startedAt: evaluation.startedAt?.toISOString() ?? null,
      completedAt: evaluation.completedAt?.toISOString() ?? null,
      createdAt: evaluation.createdAt.toISOString(),
      updatedAt: evaluation.updatedAt.toISOString(),
      contribution: {
        id: evaluation.contribution.id,
        title: evaluation.contribution.title,
        contributionType: evaluation.contribution.contributionType,
        sourceRef: evaluation.contribution.sourceRef,
      },
    };
  }

  private mapEvaluationDetail(evaluation: {
    id: string;
    contributionId: string;
    contributorId: string;
    modelId: string | null;
    status: string;
    compositeScore: { toNumber: () => number } | null;
    dimensionScores: unknown;
    narrative: string | null;
    formulaVersion: string | null;
    metadata: unknown;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    contribution: {
      id: string;
      title: string;
      contributionType: string;
      sourceRef: string;
    };
    model: { name: string; version: string; provider: string } | null;
    rubric: { version: string; parameters: unknown } | null;
  }) {
    const base = this.mapEvaluationWithContribution(evaluation);
    const meta = evaluation.metadata as Record<string, unknown> | null;

    return {
      ...base,
      model: evaluation.model
        ? {
            name: evaluation.model.name,
            version: evaluation.model.version,
            provider: evaluation.model.provider,
          }
        : null,
      provenance: meta
        ? {
            formulaVersion: (meta.formulaVersion as string) ?? evaluation.formulaVersion ?? '',
            weights: (meta.weights as Record<string, number>) ?? {},
            taskComplexityMultiplier: (meta.taskComplexityMultiplier as number) ?? 1.0,
            domainNormalizationFactor: (meta.domainNormalizationFactor as number) ?? 1.0,
            modelPromptVersion: (meta.modelPromptVersion as string) ?? '',
          }
        : null,
      rubric: evaluation.rubric
        ? {
            version: evaluation.rubric.version,
            parameters: evaluation.rubric.parameters as Record<string, unknown>,
          }
        : null,
    };
  }

  // ─── Public Evaluation Aggregate (Story 7-5) ───────────────────────────────

  async getPublicEvaluationAggregate(): Promise<PublicEvaluationAggregateDto> {
    const cached = await this.redisService.get<PublicEvaluationAggregateDto>(
      EvaluationService.PUBLIC_AGGREGATE_CACHE_KEY,
    );
    if (cached) {
      this.logger.log('Public evaluation aggregate served from cache');
      return cached;
    }

    const startTime = Date.now();

    const completedEvaluations = await this.prisma.evaluation.findMany({
      where: { status: 'COMPLETED' },
      select: {
        compositeScore: true,
        contributor: { select: { domain: true } },
      },
    });

    const totalEvaluations = completedEvaluations.length;

    // Overall average score
    const scores = completedEvaluations
      .map((e) => e.compositeScore?.toNumber())
      .filter((s): s is number => s !== null && s !== undefined);

    const averageScore =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100
        : 0;

    // By domain
    const domainMap = new Map<string, { sum: number; count: number }>();
    for (const e of completedEvaluations) {
      const domain = e.contributor?.domain ?? 'Unknown';
      const score = e.compositeScore?.toNumber();
      if (score === null || score === undefined) continue;
      const existing = domainMap.get(domain) ?? { sum: 0, count: 0 };
      existing.sum += score;
      existing.count++;
      domainMap.set(domain, existing);
    }

    const byDomain = Array.from(domainMap.entries()).map(([domain, data]) => ({
      domain,
      averageScore: Math.round((data.sum / data.count) * 100) / 100,
      count: data.count,
    }));

    // Score distribution (histogram buckets)
    const buckets = [
      { range: '0–20', min: 0, max: 20, count: 0 },
      { range: '21–40', min: 21, max: 40, count: 0 },
      { range: '41–60', min: 41, max: 60, count: 0 },
      { range: '61–80', min: 61, max: 80, count: 0 },
      { range: '81–100', min: 81, max: 100, count: 0 },
    ];

    for (const score of scores) {
      if (score <= 20) buckets[0].count++;
      else if (score <= 40) buckets[1].count++;
      else if (score <= 60) buckets[2].count++;
      else if (score <= 80) buckets[3].count++;
      else buckets[4].count++;
    }

    // Agreement rate from Story 7-4
    const agreementRates = await this.reviewService.getAgreementRates();

    const aggregate: PublicEvaluationAggregateDto = {
      totalEvaluations,
      averageScore,
      byDomain,
      scoreDistribution: buckets,
      agreementRate: {
        overall: agreementRates.overall.agreementRate,
        totalReviewed: agreementRates.overall.totalReviewed,
      },
    };

    await this.redisService.set(
      EvaluationService.PUBLIC_AGGREGATE_CACHE_KEY,
      aggregate,
      EvaluationService.PUBLIC_AGGREGATE_CACHE_TTL,
    );

    this.logger.log('Public evaluation aggregate computed and cached', {
      totalEvaluations,
      averageScore,
      domainCount: byDomain.length,
      duration: `${Date.now() - startTime}ms`,
    });

    return aggregate;
  }

  async getContributorPublicScores(
    contributorId: string,
  ): Promise<ContributorEvaluationSummaryDto | null> {
    const contributor = await this.prisma.contributor.findUnique({
      where: { id: contributorId },
      select: { id: true, showEvaluationScores: true },
    });

    if (!contributor || !contributor.showEvaluationScores) {
      return null;
    }

    const evaluations = await this.prisma.evaluation.findMany({
      where: { contributorId, status: 'COMPLETED' },
      select: {
        compositeScore: true,
        completedAt: true,
        contribution: { select: { contributionType: true } },
      },
      orderBy: { completedAt: 'desc' },
      take: 10,
    });

    if (evaluations.length === 0) {
      return null;
    }

    // Compute all-time average and count in parallel
    const [aggregateResult, totalCount] = await Promise.all([
      this.prisma.evaluation.aggregate({
        where: { contributorId, status: 'COMPLETED' },
        _avg: { compositeScore: true },
      }),
      this.prisma.evaluation.count({
        where: { contributorId, status: 'COMPLETED' },
      }),
    ]);

    const avgScore = aggregateResult._avg.compositeScore
      ? Math.round(aggregateResult._avg.compositeScore.toNumber() * 100) / 100
      : 0;

    const label = scoreToLabel(avgScore);
    const narrative = `This contributor's work has been evaluated ${totalCount} time${totalCount !== 1 ? 's' : ''} with an average quality score of ${avgScore}, placing them in the ${label} range.`;

    return {
      contributorId,
      averageScore: avgScore,
      evaluationCount: totalCount,
      narrative,
      recentScores: evaluations.map((e) => ({
        score: e.compositeScore?.toNumber() ?? 0,
        contributionType: e.contribution.contributionType,
        completedAt: e.completedAt?.toISOString() ?? '',
      })),
    };
  }
}

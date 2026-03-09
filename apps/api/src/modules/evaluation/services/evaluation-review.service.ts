import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { RedisService } from '../../../common/redis/redis.service.js';
import { DomainException } from '../../../common/exceptions/domain.exception.js';
import { ERROR_CODES } from '@edin/shared';
import type { Prisma } from '../../../../generated/prisma/client/client.js';
import type { EvaluationReviewFlaggedEvent, EvaluationReviewResolvedEvent } from '@edin/shared';

interface ReviewQueueQuery {
  cursor?: string;
  limit: number;
  domain?: string;
  status?: string;
}

@Injectable()
export class EvaluationReviewService {
  private readonly logger = new Logger(EvaluationReviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async flagEvaluation(
    evaluationId: string,
    contributorId: string,
    flagReason: string,
    correlationId: string,
  ) {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        contribution: {
          select: { id: true, title: true, contributionType: true, sourceRef: true },
        },
        review: { select: { id: true } },
      },
    });

    if (!evaluation) {
      throw new DomainException(
        ERROR_CODES.EVALUATION_NOT_FOUND,
        'Evaluation not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (evaluation.contributorId !== contributorId) {
      throw new DomainException(
        ERROR_CODES.FORBIDDEN,
        'You can only flag your own evaluations',
        HttpStatus.FORBIDDEN,
      );
    }

    if (evaluation.status !== 'COMPLETED') {
      throw new DomainException(
        ERROR_CODES.EVALUATION_NOT_COMPLETED,
        'Only completed evaluations can be flagged for review',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (evaluation.review) {
      throw new DomainException(
        ERROR_CODES.EVALUATION_ALREADY_FLAGGED,
        'This evaluation has already been flagged for review',
        HttpStatus.CONFLICT,
      );
    }

    const reviewId = randomUUID();
    const originalScores = {
      compositeScore: evaluation.compositeScore
        ? (evaluation.compositeScore as unknown as { toNumber: () => number }).toNumber()
        : 0,
      dimensionScores: evaluation.dimensionScores ?? {},
    };

    const review = await this.prisma.$transaction(async (tx) => {
      const created = await tx.evaluationReview.create({
        data: {
          id: reviewId,
          evaluationId,
          contributorId,
          status: 'PENDING',
          flagReason,
          originalScores,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: contributorId,
          action: 'EVALUATION_REVIEW_FLAGGED',
          entityType: 'EvaluationReview',
          entityId: reviewId,
          correlationId,
          details: {
            evaluationId,
            flagReason,
          },
        },
      });

      return created;
    });

    const event: EvaluationReviewFlaggedEvent = {
      eventType: 'evaluation.review.flagged',
      timestamp: new Date().toISOString(),
      correlationId,
      actorId: contributorId,
      payload: {
        reviewId: review.id,
        evaluationId,
        contributionId: evaluation.contribution.id,
        contributorId,
        contributionTitle: evaluation.contribution.title,
        flagReason,
      },
    };
    this.eventEmitter.emit('evaluation.review.flagged', event);

    this.logger.log('Evaluation flagged for human review', {
      module: 'evaluation',
      reviewId: review.id,
      evaluationId,
      contributorId,
      correlationId,
    });

    return {
      id: review.id,
      evaluationId: review.evaluationId,
      status: review.status,
      flagReason: review.flagReason,
      flaggedAt: review.flaggedAt.toISOString(),
    };
  }

  async getReviewQueue(query: ReviewQueueQuery) {
    const { cursor, limit = 20, domain, status } = query;

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (domain) {
      where.evaluation = {
        contribution: {
          contributor: { domain },
        },
      };
    }

    if (cursor) {
      const separatorIdx = cursor.lastIndexOf('|');
      if (separatorIdx > 0) {
        const cursorDate = cursor.slice(0, separatorIdx);
        const cursorId = cursor.slice(separatorIdx + 1);
        const parsedDate = new Date(cursorDate);
        if (!isNaN(parsedDate.getTime())) {
          where.OR = [
            { flaggedAt: { lt: parsedDate } },
            { flaggedAt: parsedDate, id: { lt: cursorId } },
          ];
        }
      }
    }

    const countWhere: Record<string, unknown> = {};
    if (status) countWhere.status = status;
    if (domain) {
      countWhere.evaluation = {
        contribution: {
          contributor: { domain },
        },
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.evaluationReview.findMany({
        where,
        orderBy: [{ flaggedAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        include: {
          contributor: { select: { name: true, domain: true } },
          evaluation: {
            select: {
              compositeScore: true,
              contribution: { select: { title: true } },
            },
          },
        },
      }),
      this.prisma.evaluationReview.count({ where: countWhere }),
    ]);

    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;
    const lastItem = resultItems.length > 0 ? resultItems[resultItems.length - 1] : null;
    const nextCursor =
      hasMore && lastItem ? `${lastItem.flaggedAt.toISOString()}|${lastItem.id}` : null;

    return {
      items: resultItems.map((item) => ({
        id: item.id,
        evaluationId: item.evaluationId,
        contributorName: item.contributor.name,
        contributionTitle: item.evaluation.contribution.title,
        domain: item.contributor.domain,
        originalScore: item.evaluation.compositeScore
          ? (item.evaluation.compositeScore as unknown as { toNumber: () => number }).toNumber()
          : 0,
        flagReason: item.flagReason,
        flaggedAt: item.flaggedAt.toISOString(),
        status: item.status,
      })),
      pagination: {
        cursor: nextCursor,
        hasMore,
        total,
      },
    };
  }

  async getReviewDetail(reviewId: string) {
    const review = await this.prisma.evaluationReview.findUnique({
      where: { id: reviewId },
      include: {
        contributor: { select: { name: true } },
        evaluation: {
          include: {
            contribution: {
              select: { id: true, title: true, contributionType: true, sourceRef: true },
            },
            model: { select: { name: true, version: true, provider: true } },
          },
        },
      },
    });

    if (!review) {
      throw new DomainException(
        ERROR_CODES.EVALUATION_REVIEW_NOT_FOUND,
        'Evaluation review not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      id: review.id,
      evaluationId: review.evaluationId,
      contributorId: review.contributorId,
      contributorName: review.contributor.name,
      reviewerId: review.reviewerId,
      status: review.status,
      flagReason: review.flagReason,
      reviewReason: review.reviewReason,
      originalScores: review.originalScores,
      overrideScores: review.overrideScores,
      overrideNarrative: review.overrideNarrative,
      flaggedAt: review.flaggedAt.toISOString(),
      resolvedAt: review.resolvedAt?.toISOString() ?? null,
      evaluation: {
        id: review.evaluation.id,
        narrative: review.evaluation.narrative,
        dimensionScores: review.evaluation.dimensionScores,
        compositeScore: review.evaluation.compositeScore
          ? (review.evaluation.compositeScore as unknown as { toNumber: () => number }).toNumber()
          : null,
        model: review.evaluation.model
          ? {
              name: review.evaluation.model.name,
              version: review.evaluation.model.version,
              provider: review.evaluation.model.provider,
            }
          : null,
        contribution: {
          id: review.evaluation.contribution.id,
          title: review.evaluation.contribution.title,
          contributionType: review.evaluation.contribution.contributionType,
          sourceRef: review.evaluation.contribution.sourceRef,
        },
      },
    };
  }

  async resolveReview(
    reviewId: string,
    adminId: string,
    action: 'confirm' | 'override',
    reviewReason: string,
    overrideScores?: { compositeScore: number; dimensionScores: Record<string, unknown> },
    overrideNarrative?: string,
    correlationId?: string,
  ) {
    const corrId = correlationId ?? randomUUID();

    const review = await this.prisma.evaluationReview.findUnique({
      where: { id: reviewId },
      include: {
        evaluation: {
          include: {
            contribution: { select: { id: true, title: true } },
          },
        },
      },
    });

    if (!review) {
      throw new DomainException(
        ERROR_CODES.EVALUATION_REVIEW_NOT_FOUND,
        'Evaluation review not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (review.status !== 'PENDING') {
      throw new DomainException(
        ERROR_CODES.EVALUATION_REVIEW_ALREADY_RESOLVED,
        'This review has already been resolved',
        HttpStatus.CONFLICT,
      );
    }

    const newStatus = action === 'confirm' ? 'CONFIRMED' : 'OVERRIDDEN';

    const result = await this.prisma.$transaction(async (tx) => {
      const updateData: Record<string, unknown> = {
        status: newStatus,
        reviewerId: adminId,
        reviewReason,
        resolvedAt: new Date(),
      };

      if (action === 'override' && !overrideScores) {
        throw new DomainException(
          ERROR_CODES.VALIDATION_ERROR,
          'Override scores are required when action is override',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (action === 'override' && overrideScores) {
        updateData.overrideScores = overrideScores;
        updateData.overrideNarrative = overrideNarrative ?? null;

        // Replace evaluation scores with override values
        await tx.evaluation.update({
          where: { id: review.evaluationId },
          data: {
            compositeScore: overrideScores.compositeScore,
            dimensionScores: overrideScores.dimensionScores as unknown as Prisma.InputJsonValue,
            ...(overrideNarrative ? { narrative: overrideNarrative } : {}),
          },
        });
      }

      const updated = await tx.evaluationReview.update({
        where: { id: reviewId },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'EVALUATION_REVIEW_RESOLVED',
          entityType: 'EvaluationReview',
          entityId: reviewId,
          correlationId: corrId,
          details: {
            evaluationId: review.evaluationId,
            resolution: action,
            reviewReason,
            ...(action === 'override' && overrideScores
              ? { overrideCompositeScore: overrideScores.compositeScore }
              : {}),
          },
        },
      });

      return updated;
    });

    // Invalidate Redis cache for the evaluation's contribution
    const evaluation = review.evaluation;
    await this.redisService.del(`evaluation:${evaluation.contributionId}`).catch((err: unknown) => {
      this.logger.warn('Failed to invalidate evaluation cache', {
        module: 'evaluation',
        contributionId: evaluation.contributionId,
        error: err instanceof Error ? err.message : String(err),
      });
    });

    const event: EvaluationReviewResolvedEvent = {
      eventType: 'evaluation.review.resolved',
      timestamp: new Date().toISOString(),
      correlationId: corrId,
      actorId: adminId,
      payload: {
        reviewId,
        evaluationId: review.evaluationId,
        contributorId: review.contributorId,
        contributionTitle: evaluation.contribution.title,
        action,
        reviewerId: adminId,
      },
    };
    this.eventEmitter.emit('evaluation.review.resolved', event);

    this.logger.log('Evaluation review resolved', {
      module: 'evaluation',
      reviewId,
      evaluationId: review.evaluationId,
      action,
      adminId,
      correlationId: corrId,
    });

    return {
      id: result.id,
      status: result.status,
      reviewReason: result.reviewReason,
      resolvedAt: result.resolvedAt?.toISOString() ?? null,
    };
  }

  async getAgreementRates(modelId?: string) {
    const baseWhere: Record<string, unknown> = {
      status: { in: ['CONFIRMED', 'OVERRIDDEN'] },
    };

    if (modelId) {
      baseWhere.evaluation = { modelId };
    }

    const allResolved = await this.prisma.evaluationReview.findMany({
      where: baseWhere,
      select: {
        status: true,
        evaluation: {
          select: {
            modelId: true,
            model: { select: { version: true } },
            contribution: {
              select: {
                contributor: { select: { domain: true } },
              },
            },
          },
        },
      },
    });

    // Overall (scoped to modelId filter when provided, global otherwise)
    const totalReviewed = allResolved.length;
    const confirmed = allResolved.filter((r) => r.status === 'CONFIRMED').length;
    const overridden = allResolved.filter((r) => r.status === 'OVERRIDDEN').length;
    const agreementRate = totalReviewed > 0 ? Math.round((confirmed / totalReviewed) * 100) : 0;

    // By model
    const modelMap = new Map<string, { confirmed: number; overridden: number; version: string }>();
    for (const r of allResolved) {
      const mId = r.evaluation.modelId;
      if (!mId) continue;
      const existing = modelMap.get(mId) ?? {
        confirmed: 0,
        overridden: 0,
        version: r.evaluation.model?.version ?? '',
      };
      if (r.status === 'CONFIRMED') existing.confirmed++;
      else existing.overridden++;
      modelMap.set(mId, existing);
    }

    const byModel = Array.from(modelMap.entries()).map(([mId, data]) => {
      const total = data.confirmed + data.overridden;
      return {
        modelId: mId,
        modelVersion: data.version,
        totalReviewed: total,
        confirmed: data.confirmed,
        overridden: data.overridden,
        agreementRate: total > 0 ? Math.round((data.confirmed / total) * 100) : 0,
      };
    });

    // By domain
    const domainMap = new Map<string, { confirmed: number; overridden: number }>();
    for (const r of allResolved) {
      const domain = r.evaluation.contribution?.contributor?.domain ?? 'Unknown';
      const existing = domainMap.get(domain) ?? { confirmed: 0, overridden: 0 };
      if (r.status === 'CONFIRMED') existing.confirmed++;
      else existing.overridden++;
      domainMap.set(domain, existing);
    }

    const byDomain = Array.from(domainMap.entries()).map(([domain, data]) => {
      const total = data.confirmed + data.overridden;
      return {
        domain,
        totalReviewed: total,
        confirmed: data.confirmed,
        overridden: data.overridden,
        agreementRate: total > 0 ? Math.round((data.confirmed / total) * 100) : 0,
      };
    });

    return { overall: { totalReviewed, confirmed, overridden, agreementRate }, byModel, byDomain };
  }

  async getReviewStatusForEvaluation(evaluationId: string) {
    const review = await this.prisma.evaluationReview.findUnique({
      where: { evaluationId },
      select: { id: true, status: true, flaggedAt: true, resolvedAt: true },
    });

    return review
      ? {
          id: review.id,
          status: review.status,
          flaggedAt: review.flaggedAt.toISOString(),
          resolvedAt: review.resolvedAt?.toISOString() ?? null,
        }
      : null;
  }
}

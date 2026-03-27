import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '../../../generated/prisma/client/client.js';
import type { ContributorDomain } from '../../../generated/prisma/client/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ActivityService } from '../activity/activity.service.js';
import type {
  EvaluationCompletedEvent,
  CrossDomainDetectedEvent,
  HighSignificanceDetectedEvent,
  CrossDomainCollaborationMetadata,
  HighSignificanceMetadata,
} from '@edin/shared';

const BASELINE_WINDOW_DAYS = 90;

@Injectable()
export class MeaningfulEventService {
  private readonly logger = new Logger(MeaningfulEventService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly activityService: ActivityService,
  ) {}

  @OnEvent('evaluation.score.completed')
  async handleEvaluationCompleted(event: EvaluationCompletedEvent): Promise<void> {
    const { correlationId } = event;
    const { contributionId, contributorId, compositeScore, domain } = event.payload;

    await Promise.allSettled([
      this.checkCrossDomainCollaboration(
        contributionId,
        contributorId,
        domain,
        correlationId,
      ).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error('Failed cross-domain collaboration check', {
          module: 'prizes',
          contributionId,
          contributorId,
          correlationId,
          error: message,
        });
      }),
      this.checkHighSignificance(
        contributionId,
        contributorId,
        compositeScore,
        domain,
        correlationId,
      ).catch((err: unknown) => {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error('Failed high-significance check', {
          module: 'prizes',
          contributionId,
          contributorId,
          correlationId,
          error: message,
        });
      }),
    ]);
  }

  async checkCrossDomainCollaboration(
    contributionId: string,
    contributorId: string,
    domain: string | null,
    correlationId: string,
  ): Promise<void> {
    const memberships = await this.prisma.workingGroupMember.findMany({
      where: { contributorId },
      include: {
        workingGroup: { select: { id: true, domain: true } },
      },
      orderBy: { workingGroup: { domain: 'asc' } },
    });

    const distinctDomains = [...new Set(memberships.map((m) => m.workingGroup.domain))];

    if (distinctDomains.length < 2) {
      return;
    }

    const channels = await this.prisma.channel.findMany({
      where: {
        type: 'DOMAIN',
        isActive: true,
      },
    });

    const domainChannelMap = new Map<string, string>();
    for (const channel of channels) {
      domainChannelMap.set(channel.name, channel.id);
    }

    const matchingChannelIds = distinctDomains
      .map((d) => domainChannelMap.get(d))
      .filter((id): id is string => id != null);

    const contributorDomain = (domain ?? distinctDomains[0]) as ContributorDomain;

    const metadata: CrossDomainCollaborationMetadata = {
      domains: distinctDomains,
      channelIds: matchingChannelIds,
      contributionId,
      contributorWorkingGroups: memberships.map((m) => m.workingGroup.id),
    };

    await this.activityService.createActivityEvent({
      eventType: 'CROSS_DOMAIN_COLLABORATION_DETECTED',
      title: `Cross-domain collaboration detected across ${distinctDomains.join(', ')}`,
      description: `Contribution spans ${distinctDomains.length} domains`,
      contributorId,
      domain: contributorDomain,
      entityId: contributionId,
      metadata: metadata as unknown as Record<string, unknown>,
    });

    const downstreamEvent: CrossDomainDetectedEvent = {
      eventType: 'prize.event.cross_domain_detected',
      timestamp: new Date().toISOString(),
      correlationId,
      actorId: contributorId,
      payload: {
        contributionId,
        contributorId,
        domains: distinctDomains,
        channelIds: matchingChannelIds,
      },
    };
    this.eventEmitter.emit('prize.event.cross_domain_detected', downstreamEvent);

    this.logger.log('Cross-domain collaboration detected', {
      module: 'prizes',
      contributionId,
      contributorId,
      domains: distinctDomains,
      correlationId,
    });
  }

  async checkHighSignificance(
    contributionId: string,
    contributorId: string,
    compositeScore: number,
    domain: string | null,
    correlationId: string,
  ): Promise<void> {
    if (!domain) {
      this.logger.debug('Skipping high-significance check: no domain', {
        module: 'prizes',
        contributionId,
        contributorId,
      });
      return;
    }

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - BASELINE_WINDOW_DAYS);

    const result = await this.prisma.$queryRaw<
      Array<{ percentile_95: number | null; sample_size: bigint }>
    >(
      Prisma.sql`
        SELECT
          percentile_cont(0.95) WITHIN GROUP (ORDER BY e.composite_score::float) AS percentile_95,
          COUNT(*)::bigint AS sample_size
        FROM evaluation.evaluations e
        JOIN core.contributors c ON c.id = e.contributor_id
        WHERE e.status = 'COMPLETED'
          AND e.completed_at >= ${windowStart}
          AND c.domain = ${domain}::"ContributorDomain"
          AND e.composite_score IS NOT NULL
      `,
    );

    const row = result[0];
    if (!row || row.percentile_95 == null || Number(row.sample_size) === 0) {
      this.logger.debug('Insufficient baseline data for high-significance check', {
        module: 'prizes',
        contributionId,
        domain,
        sampleSize: row ? Number(row.sample_size) : 0,
      });
      return;
    }

    const threshold = Number(row.percentile_95);
    const sampleSize = Number(row.sample_size);

    if (compositeScore <= threshold) {
      return;
    }

    const rankResult = await this.prisma.$queryRaw<Array<{ percentile_rank: number }>>(
      Prisma.sql`
        SELECT
          (COUNT(*) FILTER (WHERE e.composite_score::float <= ${compositeScore})::float
           / NULLIF(COUNT(*)::float, 0) * 100) AS percentile_rank
        FROM evaluation.evaluations e
        JOIN core.contributors c ON c.id = e.contributor_id
        WHERE e.status = 'COMPLETED'
          AND e.completed_at >= ${windowStart}
          AND c.domain = ${domain}::"ContributorDomain"
          AND e.composite_score IS NOT NULL
      `,
    );

    if (rankResult[0]?.percentile_rank == null) {
      this.logger.debug('Percentile rank calculation returned null, skipping', {
        module: 'prizes',
        contributionId,
        domain,
      });
      return;
    }

    const percentileRank = Math.round(rankResult[0].percentile_rank);

    const channel = await this.prisma.channel.findFirst({
      where: { type: 'DOMAIN', name: domain, isActive: true },
      select: { id: true },
    });

    const contributorDomain = domain as ContributorDomain;

    const metadata: HighSignificanceMetadata = {
      compositeScore,
      percentileRank,
      domainBaseline95th: Math.round(threshold * 100) / 100,
      domain,
      channelId: channel?.id ?? null,
      baselineWindowDays: BASELINE_WINDOW_DAYS,
      baselineSampleSize: sampleSize,
    };

    await this.activityService.createActivityEvent({
      eventType: 'HIGH_SIGNIFICANCE_CONTRIBUTION',
      title: `High-significance contribution (top ${100 - percentileRank}% in ${domain})`,
      description: `Score ${compositeScore} exceeds 95th percentile threshold of ${metadata.domainBaseline95th}`,
      contributorId,
      domain: contributorDomain,
      entityId: contributionId,
      metadata: metadata as unknown as Record<string, unknown>,
    });

    const downstreamEvent: HighSignificanceDetectedEvent = {
      eventType: 'prize.event.high_significance_detected',
      timestamp: new Date().toISOString(),
      correlationId,
      actorId: contributorId,
      payload: {
        contributionId,
        contributorId,
        compositeScore,
        percentileRank,
        domainBaseline95th: metadata.domainBaseline95th,
        domain,
        channelId: channel?.id ?? null,
      },
    };
    this.eventEmitter.emit('prize.event.high_significance_detected', downstreamEvent);

    this.logger.log('High-significance contribution detected', {
      module: 'prizes',
      contributionId,
      contributorId,
      compositeScore,
      percentileRank,
      threshold,
      domain,
      correlationId,
    });
  }
}

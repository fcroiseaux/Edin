import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '../../../generated/prisma/client/client.js';
import type { ContributorDomain } from '../../../generated/prisma/client/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ActivityService } from '../activity/activity.service.js';
import { ChathamHouseAttributionService } from '../newspaper/chatham-house-attribution.service.js';
import type {
  CrossDomainDetectedEvent,
  PrizeAwardedEvent,
  PrizeAwardedMetadata,
} from '@edin/shared';

const SIGNIFICANCE_TIER_NOTABLE = 1;
const SIGNIFICANCE_TIER_SIGNIFICANT = 2;
const SIGNIFICANCE_TIER_EXCEPTIONAL = 3;

const SIGNIFICANCE_LABELS: Record<number, string> = {
  [SIGNIFICANCE_TIER_NOTABLE]: 'Notable',
  [SIGNIFICANCE_TIER_SIGNIFICANT]: 'Significant',
  [SIGNIFICANCE_TIER_EXCEPTIONAL]: 'Exceptional',
};

const CROSS_DOMAIN_PRIZE_CATEGORY_NAME = 'Cross-Domain Collaboration';

@Injectable()
export class CrossDomainPrizeService {
  private readonly logger = new Logger(CrossDomainPrizeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly activityService: ActivityService,
    private readonly chathamHouseAttributionService: ChathamHouseAttributionService,
  ) {}

  @OnEvent('prize.event.cross_domain_detected')
  async handleCrossDomainDetected(event: CrossDomainDetectedEvent): Promise<void> {
    const { correlationId } = event;
    const { contributionId, contributorId, domains, channelIds } = event.payload;

    try {
      // 1. Load prize category
      const prizeCategory = await this.prisma.prizeCategory.findFirst({
        where: { name: CROSS_DOMAIN_PRIZE_CATEGORY_NAME, isActive: true },
      });

      if (!prizeCategory) {
        this.logger.warn('Cross-Domain Collaboration prize category not found or inactive', {
          module: 'prizes',
          correlationId,
        });
        return;
      }

      // 2. Idempotency check
      const existingAward = await this.prisma.prizeAward.findFirst({
        where: {
          contributionId,
          prizeCategoryId: prizeCategory.id,
        },
      });

      if (existingAward) {
        this.logger.debug('Prize already awarded for this contribution, skipping', {
          module: 'prizes',
          contributionId,
          prizeAwardId: existingAward.id,
          correlationId,
        });
        return;
      }

      // 3. Frequency cap check
      const frequencyCapExceeded = await this.checkFrequencyCap(
        contributorId,
        prizeCategory.id,
        prizeCategory.scalingConfig,
        correlationId,
      );
      if (frequencyCapExceeded) {
        return;
      }

      // 4. Load contribution evaluation
      const evaluation = await this.prisma.$queryRaw<Array<{ composite_score: number | null }>>(
        Prisma.sql`
          SELECT composite_score
          FROM evaluation.evaluations
          WHERE contribution_id = ${contributionId}::uuid
            AND status = 'COMPLETED'
            AND composite_score IS NOT NULL
          ORDER BY completed_at DESC
          LIMIT 1
        `,
      );

      if (!evaluation[0] || evaluation[0].composite_score == null) {
        this.logger.warn('No completed evaluation found for contribution', {
          module: 'prizes',
          contributionId,
          correlationId,
        });
        return;
      }

      const compositeScore = Number(evaluation[0].composite_score);

      // 5. Threshold evaluation
      const thresholdConfig = prizeCategory.thresholdConfig as Record<
        string,
        Record<string, unknown>
      >;
      const crossDomainConfig = thresholdConfig?.cross_domain ?? {};
      const minDomains = Number(crossDomainConfig.min_domains ?? 2);
      const minCompositeScore = Number(crossDomainConfig.min_composite_score ?? 0);

      if (domains.length < minDomains) {
        this.logger.debug('Domains below threshold, no prize awarded', {
          module: 'prizes',
          contributionId,
          domainsCount: domains.length,
          minDomains,
          correlationId,
        });
        return;
      }

      if (compositeScore < minCompositeScore) {
        this.logger.debug('Composite score below threshold, no prize awarded', {
          module: 'prizes',
          contributionId,
          compositeScore,
          minCompositeScore,
          correlationId,
        });
        return;
      }

      // 6. Determine significance level (discrete tiers)
      const significanceLevel = this.determineSignificanceLevel(
        compositeScore,
        domains.length,
        crossDomainConfig,
      );

      // 7. Generate Chatham House label
      const chathamHouseLabel = await this.generateChathamHouseLabel(contributorId);

      // 8. Generate narrative
      const domainsText =
        domains.length === 2
          ? domains.join(' and ')
          : `${domains.slice(0, -1).join(', ')}, and ${domains[domains.length - 1]}`;
      const narrative = `Recognized for bridging ${domainsText} domains with a composite score of ${compositeScore}`;

      // 9. Determine award channel
      const crossDomainChannel = await this.prisma.channel.findFirst({
        where: { type: 'CROSS_DOMAIN', isActive: true },
        select: { id: true },
      });
      const channelId = crossDomainChannel?.id ?? channelIds[0];

      if (!channelId) {
        this.logger.warn('No channel found for prize award', {
          module: 'prizes',
          contributionId,
          correlationId,
        });
        return;
      }

      // 10. Look up contributor's primary domain
      const contributor = await this.prisma.contributor.findUnique({
        where: { id: contributorId },
        select: { domain: true },
      });
      const contributorDomain = (contributor?.domain ?? domains[0]) as ContributorDomain;

      // 11. Create PrizeAward record
      const prizeAward = await this.prisma.prizeAward.create({
        data: {
          prizeCategoryId: prizeCategory.id,
          recipientContributorId: contributorId,
          contributionId,
          significanceLevel,
          channelId,
          chathamHouseLabel,
          narrative,
          metadata: {
            domains,
            compositeScore,
            correlationId,
          } as Prisma.InputJsonValue,
        },
      });

      // 12. Emit PRIZE_AWARDED activity event
      const activityMetadata: PrizeAwardedMetadata = {
        prizeCategoryId: prizeCategory.id,
        prizeCategoryName: prizeCategory.name,
        prizeAwardId: prizeAward.id,
        significanceLevel,
        channelId,
        chathamHouseLabel,
        contributionId,
      };

      await this.activityService.createActivityEvent({
        eventType: 'PRIZE_AWARDED',
        title: `Cross-Domain Collaboration Prize Awarded (${SIGNIFICANCE_LABELS[significanceLevel]})`,
        description: narrative,
        contributorId,
        domain: contributorDomain,
        entityId: prizeAward.id,
        metadata: activityMetadata as unknown as Record<string, unknown>,
      });

      // 13. Emit downstream event for notification consumption
      const prizeAwardedEvent: PrizeAwardedEvent = {
        eventType: 'prize.event.awarded',
        timestamp: new Date().toISOString(),
        correlationId,
        actorId: contributorId,
        payload: {
          prizeAwardId: prizeAward.id,
          prizeCategoryId: prizeCategory.id,
          prizeCategoryName: prizeCategory.name,
          recipientContributorId: contributorId,
          contributionId,
          significanceLevel,
          channelId,
          chathamHouseLabel,
          narrative,
        },
      };
      this.eventEmitter.emit('prize.event.awarded', prizeAwardedEvent);

      this.logger.log('Cross-Domain Collaboration Prize awarded', {
        module: 'prizes',
        prizeAwardId: prizeAward.id,
        prizeCategoryId: prizeCategory.id,
        contributorId,
        contributionId,
        significanceLevel,
        domains,
        correlationId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to process cross-domain prize detection', {
        module: 'prizes',
        contributionId,
        contributorId,
        correlationId,
        error: message,
      });
    }
  }

  private determineSignificanceLevel(
    compositeScore: number,
    domainCount: number,
    config: Record<string, unknown>,
  ): number {
    const exceptionalScoreThreshold = Number(config.exceptional_score_threshold ?? 95);
    const significantScoreThreshold = Number(config.significant_score_threshold ?? 85);

    if (compositeScore >= exceptionalScoreThreshold || domainCount >= 3) {
      return SIGNIFICANCE_TIER_EXCEPTIONAL;
    }
    if (compositeScore >= significantScoreThreshold) {
      return SIGNIFICANCE_TIER_SIGNIFICANT;
    }
    return SIGNIFICANCE_TIER_NOTABLE;
  }

  private async generateChathamHouseLabel(contributorId: string): Promise<string> {
    return this.chathamHouseAttributionService.generateLabel(contributorId);
  }

  private async checkFrequencyCap(
    contributorId: string,
    prizeCategoryId: string,
    scalingConfig: unknown,
    correlationId: string,
  ): Promise<boolean> {
    const config = scalingConfig as Record<string, Record<string, number>> | null;
    const frequencyCap = config?.frequency_cap;

    if (!frequencyCap) {
      return false;
    }

    const maxAwards = frequencyCap.max_awards_per_contributor_per_period;
    const periodDays = frequencyCap.period_days;

    if (!maxAwards || !periodDays) {
      return false;
    }

    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    const recentAwardCount = await this.prisma.prizeAward.count({
      where: {
        recipientContributorId: contributorId,
        prizeCategoryId,
        awardedAt: { gte: periodStart },
      },
    });

    if (recentAwardCount >= maxAwards) {
      this.logger.log('Frequency cap exceeded, skipping prize award', {
        module: 'prizes',
        contributorId,
        prizeCategoryId,
        recentAwardCount,
        maxAwards,
        periodDays,
        correlationId,
      });
      return true;
    }

    return false;
  }
}

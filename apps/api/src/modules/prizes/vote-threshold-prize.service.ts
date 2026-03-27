import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '../../../generated/prisma/client/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ActivityService } from '../activity/activity.service.js';
import { ChathamHouseAttributionService } from '../newspaper/chatham-house-attribution.service.js';
import type {
  NominationVoteCastEvent,
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

const COMMUNITY_RECOGNITION_PRIZE_CATEGORY_NAME = 'Community Recognition';

@Injectable()
export class VoteThresholdPrizeService {
  private readonly logger = new Logger(VoteThresholdPrizeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly activityService: ActivityService,
    private readonly chathamHouseAttributionService: ChathamHouseAttributionService,
  ) {}

  @OnEvent('prize.event.nomination_vote_cast')
  async handleNominationVoteCast(event: NominationVoteCastEvent): Promise<void> {
    const { correlationId } = event;
    const { nominationId, nomineeId, currentVoteCount } = event.payload;

    try {
      // 1. Load nomination with relations
      const nomination = await this.prisma.communityNomination.findUnique({
        where: { id: nominationId },
        include: {
          prizeCategory: { select: { id: true, name: true } },
          channel: { select: { id: true, name: true } },
        },
      });

      if (!nomination) {
        this.logger.warn('Nomination not found for vote threshold check', {
          module: 'prizes',
          nominationId,
          correlationId,
        });
        return;
      }

      // 2. Status check — skip if already awarded/expired/withdrawn
      if (nomination.status !== 'OPEN') {
        this.logger.debug('Nomination not OPEN, skipping vote threshold check', {
          module: 'prizes',
          nominationId,
          status: nomination.status,
          correlationId,
        });
        return;
      }

      // 3. Load prize category (fresh read for AC4 — new config applies immediately)
      const prizeCategory = await this.prisma.prizeCategory.findFirst({
        where: { name: COMMUNITY_RECOGNITION_PRIZE_CATEGORY_NAME, isActive: true },
      });

      if (!prizeCategory) {
        this.logger.warn('Community Recognition prize category not found or inactive', {
          module: 'prizes',
          correlationId,
        });
        return;
      }

      // 4. Parse threshold config
      const thresholdConfig = prizeCategory.thresholdConfig as Record<
        string,
        Record<string, unknown>
      >;
      const communityConfig = thresholdConfig?.community ?? {};
      const minVotes = Number(communityConfig.min_votes ?? 5);

      // 5. Below threshold — no action needed
      if (currentVoteCount < minVotes) {
        this.logger.debug('Vote count below threshold, no prize triggered', {
          module: 'prizes',
          nominationId,
          currentVoteCount,
          minVotes,
          correlationId,
        });
        return;
      }

      // 6. Frequency cap check
      const frequencyCapExceeded = await this.checkFrequencyCap(
        nomineeId,
        prizeCategory.id,
        prizeCategory.scalingConfig,
        correlationId,
      );
      if (frequencyCapExceeded) {
        return;
      }

      // 7. Determine significance level from vote count tiers
      const significanceLevel = this.determineSignificanceLevel(currentVoteCount, communityConfig);

      // 8. Generate Chatham House label
      const chathamHouseLabel = await this.generateChathamHouseLabel(nomineeId);

      // 9. Generate narrative from nomination rationale
      const rationaleExcerpt =
        nomination.rationale.length > 120
          ? nomination.rationale.substring(0, 120) + '...'
          : nomination.rationale;
      const narrative = `Community recognition for ${rationaleExcerpt} — endorsed by ${currentVoteCount} peers`;

      // 10. Use nomination's channel
      const channelId = nomination.channelId;

      if (!channelId) {
        this.logger.warn('No channel found on nomination for prize award', {
          module: 'prizes',
          nominationId,
          correlationId,
        });
        return;
      }

      // 11. Look up nominee's primary domain
      const contributor = await this.prisma.contributor.findUnique({
        where: { id: nomineeId },
        select: { domain: true },
      });
      const contributorDomain = contributor?.domain ?? 'Technology';

      // 12. Transaction: update nomination status + create prize award atomically
      //     Uses conditional update (status: 'OPEN') to prevent duplicate awards
      //     under concurrent vote processing (TOCTOU guard).
      const prizeAward = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.communityNomination.updateMany({
          where: { id: nominationId, status: 'OPEN' },
          data: { status: 'AWARDED' },
        });

        if (updated.count === 0) {
          // Another handler already awarded this nomination concurrently
          return null;
        }

        return tx.prizeAward.create({
          data: {
            prizeCategoryId: prizeCategory.id,
            recipientContributorId: nomineeId,
            contributionId: null,
            significanceLevel,
            channelId,
            chathamHouseLabel,
            narrative,
            metadata: {
              nominationId,
              voteCount: currentVoteCount,
              correlationId,
            } as Prisma.InputJsonValue,
          },
        });
      });

      if (!prizeAward) {
        this.logger.debug('Nomination already awarded by concurrent handler, skipping', {
          module: 'prizes',
          nominationId,
          correlationId,
        });
        return;
      }

      // 13. Emit PRIZE_AWARDED activity event
      const activityMetadata: PrizeAwardedMetadata = {
        prizeCategoryId: prizeCategory.id,
        prizeCategoryName: prizeCategory.name,
        prizeAwardId: prizeAward.id,
        significanceLevel,
        channelId,
        chathamHouseLabel,
        contributionId: null,
      };

      await this.activityService.createActivityEvent({
        eventType: 'PRIZE_AWARDED',
        title: `Community Recognition Prize Awarded (${SIGNIFICANCE_LABELS[significanceLevel]})`,
        description: narrative,
        contributorId: nomineeId,
        domain: contributorDomain,
        entityId: prizeAward.id,
        metadata: activityMetadata as unknown as Record<string, unknown>,
      });

      // 14. Emit downstream event for notification consumption
      const prizeAwardedEvent: PrizeAwardedEvent = {
        eventType: 'prize.event.awarded',
        timestamp: new Date().toISOString(),
        correlationId,
        actorId: nomineeId,
        payload: {
          prizeAwardId: prizeAward.id,
          prizeCategoryId: prizeCategory.id,
          prizeCategoryName: prizeCategory.name,
          recipientContributorId: nomineeId,
          contributionId: null,
          significanceLevel,
          channelId,
          chathamHouseLabel,
          narrative,
        },
      };
      this.eventEmitter.emit('prize.event.awarded', prizeAwardedEvent);

      this.logger.log('Community Recognition Prize awarded via vote threshold', {
        module: 'prizes',
        prizeAwardId: prizeAward.id,
        prizeCategoryId: prizeCategory.id,
        nomineeId,
        nominationId,
        significanceLevel,
        voteCount: currentVoteCount,
        correlationId,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error('Failed to process vote threshold prize', {
        module: 'prizes',
        nominationId,
        nomineeId,
        correlationId,
        error: message,
      });
    }
  }

  private determineSignificanceLevel(voteCount: number, config: Record<string, unknown>): number {
    const tiers = config.tiers as Record<string, Record<string, number>> | undefined;

    const exceptionalMinVotes = tiers?.exceptional?.min_votes ?? 20;
    const significantMinVotes = tiers?.significant?.min_votes ?? 10;

    if (voteCount >= exceptionalMinVotes) {
      return SIGNIFICANCE_TIER_EXCEPTIONAL;
    }
    if (voteCount >= significantMinVotes) {
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
      this.logger.log('Frequency cap exceeded for Community Recognition, skipping prize award', {
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

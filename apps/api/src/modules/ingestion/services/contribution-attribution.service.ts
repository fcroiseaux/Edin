import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { RedisService } from '../../../common/redis/redis.service.js';
import type { ContributionIngestedEvent } from '@edin/shared';

@Injectable()
export class ContributionAttributionService {
  private readonly logger = new Logger(ContributionAttributionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly redisService: RedisService,
  ) {}

  @OnEvent('contribution.*.ingested')
  async handleContributionIngested(event: ContributionIngestedEvent): Promise<void> {
    this.logger.log('Attribution triggered for ingested contribution', {
      contributionType: event.contributionType,
      repositoryId: event.repositoryId,
      correlationId: event.correlationId,
    });

    if (!event.contributionId) {
      this.logger.warn('Attribution event missing contribution identifier', {
        contributionType: event.contributionType,
        repositoryId: event.repositoryId,
        correlationId: event.correlationId,
      });
      return;
    }

    await this.attributeContribution(event.contributionId, event.correlationId);
  }

  async attributeContribution(contributionId: string, correlationId?: string): Promise<void> {
    const contribution = await this.prisma.contribution.findUnique({
      where: { id: contributionId },
      select: {
        id: true,
        contributorId: true,
        contributionType: true,
        repositoryId: true,
        status: true,
        rawData: true,
      },
    });

    if (!contribution) {
      this.logger.warn('Contribution not found for attribution', { contributionId, correlationId });
      return;
    }

    // If already attributed by the webhook processor, just update status
    if (contribution.contributorId) {
      await this.prisma.contribution.update({
        where: { id: contributionId },
        data: { status: 'ATTRIBUTED' },
      });

      this.logger.log('Contribution attributed via existing contributorId', {
        contributionId,
        contributorId: contribution.contributorId,
        correlationId,
      });

      this.eventEmitter.emit('contribution.attributed', {
        contributionId,
        contributionType: contribution.contributionType,
        contributorId: contribution.contributorId,
        repositoryId: contribution.repositoryId,
        correlationId,
      });

      // Publish to Redis for SSE
      await this.publishContributionEvent(contribution.contributorId, {
        type: 'contribution.new',
        contributionId,
        contributionType: contribution.contributionType,
      });

      return;
    }

    // Try to match by GitHub ID or email from rawData
    const rawData = contribution.rawData as Record<string, unknown>;
    const extracted = rawData?.extracted as Record<string, unknown> | undefined;

    // Try GitHub ID first
    let matchedContributorId: string | null = null;

    const authorGithubId = extracted?.authorGithubId as number | null | undefined;
    if (authorGithubId != null) {
      const contributor = await this.prisma.contributor.findUnique({
        where: { githubId: authorGithubId },
        select: { id: true },
      });
      if (contributor) {
        matchedContributorId = contributor.id;
      }
    }

    // Fallback: try email matching
    if (!matchedContributorId) {
      const authorUsername = this.extractAuthorUsername(rawData, extracted);
      if (authorUsername) {
        const contributor = await this.prisma.contributor.findUnique({
          where: { githubUsername: authorUsername },
          select: { id: true },
        });
        if (contributor) {
          matchedContributorId = contributor.id;
        }
      }
    }

    if (!matchedContributorId) {
      const authorEmail = extracted?.authorEmail as string | null | undefined;
      if (authorEmail) {
        const contributor = await this.prisma.contributor.findUnique({
          where: { email: authorEmail },
          select: { id: true },
        });
        if (contributor) {
          matchedContributorId = contributor.id;
        }
      }
    }

    if (matchedContributorId) {
      await this.prisma.contribution.update({
        where: { id: contributionId },
        data: {
          contributorId: matchedContributorId,
          status: 'ATTRIBUTED',
        },
      });

      this.logger.log('Contribution attributed successfully', {
        contributionId,
        contributorId: matchedContributorId,
        correlationId,
      });

      this.eventEmitter.emit('contribution.attributed', {
        contributionId,
        contributionType: contribution.contributionType,
        contributorId: matchedContributorId,
        repositoryId: contribution.repositoryId,
        correlationId,
      });

      // Publish to Redis for SSE
      await this.publishContributionEvent(matchedContributorId, {
        type: 'contribution.new',
        contributionId,
        contributionType: contribution.contributionType,
      });
    } else {
      await this.prisma.contribution.update({
        where: { id: contributionId },
        data: { status: 'UNATTRIBUTED' },
      });

      this.logger.log('Contribution unattributed - no matching contributor found', {
        contributionId,
        correlationId,
      });
    }
  }

  private async publishContributionEvent(
    contributorId: string,
    event: { type: string; contributionId: string; contributionType: string },
  ): Promise<void> {
    const channel = `contributions:contributor:${contributorId}`;
    await this.redisService.publish(channel, JSON.stringify(event));

    this.logger.debug('Published SSE event to Redis', {
      channel,
      contributionId: event.contributionId,
    });
  }

  private extractAuthorUsername(
    rawData: Record<string, unknown>,
    extracted?: Record<string, unknown>,
  ): string | null {
    const extractedUsername = extracted?.authorUsername;
    if (typeof extractedUsername === 'string' && extractedUsername.length > 0) {
      return extractedUsername;
    }

    const rawUser = rawData.user as Record<string, unknown> | undefined;
    if (typeof rawUser?.login === 'string' && rawUser.login.length > 0) {
      return rawUser.login;
    }

    const rawSender = rawData.sender as Record<string, unknown> | undefined;
    if (typeof rawSender?.login === 'string' && rawSender.login.length > 0) {
      return rawSender.login;
    }

    return null;
  }
}

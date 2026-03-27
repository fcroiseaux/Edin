import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ActivityService } from '../activity/activity.service.js';
import { randomUUID } from 'crypto';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ERROR_CODES } from '@edin/shared';
import type { CreateNominationDto, PeerNominationReceivedEvent } from '@edin/shared';
import type { ContributorDomain } from '../../../generated/prisma/client/enums.js';

const COOLDOWN_DAYS = 30;
const EXPIRY_DAYS = 30;

@Injectable()
export class CommunityNominationService {
  private readonly logger = new Logger(CommunityNominationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly activityService: ActivityService,
  ) {}

  async create(nominatorId: string, dto: CreateNominationDto) {
    const correlationId = randomUUID();

    // 1. Self-nomination check
    if (nominatorId === dto.nomineeId) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'You cannot nominate yourself',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 2. Verify nominee exists
    const nominee = await this.prisma.contributor.findUnique({
      where: { id: dto.nomineeId },
      select: { id: true, name: true, domain: true },
    });

    if (!nominee) {
      throw new DomainException(ERROR_CODES.NOT_FOUND, 'Nominee not found', HttpStatus.NOT_FOUND);
    }

    // 3. Verify prize category exists, is active, and is COMMUNITY_NOMINATED type
    const prizeCategory = await this.prisma.prizeCategory.findFirst({
      where: { id: dto.prizeCategoryId, isActive: true },
      select: { id: true, name: true, detectionType: true },
    });

    if (!prizeCategory) {
      throw new DomainException(
        ERROR_CODES.NOT_FOUND,
        'Prize category not found or inactive',
        HttpStatus.NOT_FOUND,
      );
    }

    if (prizeCategory.detectionType !== 'COMMUNITY_NOMINATED') {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Only community-nominated prize categories are allowed for peer nominations',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 4. Verify channel exists and is active
    const channel = await this.prisma.channel.findFirst({
      where: { id: dto.channelId, isActive: true },
      select: { id: true, name: true },
    });

    if (!channel) {
      throw new DomainException(
        ERROR_CODES.NOT_FOUND,
        'Channel not found or inactive',
        HttpStatus.NOT_FOUND,
      );
    }

    // 5. Cooldown check + create in a transaction to prevent TOCTOU race
    const cooldownDate = new Date();
    cooldownDate.setDate(cooldownDate.getDate() - COOLDOWN_DAYS);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + EXPIRY_DAYS);

    const nomination = await this.prisma.$transaction(async (tx) => {
      const existingNomination = await tx.communityNomination.findFirst({
        where: {
          nominatorId,
          nomineeId: dto.nomineeId,
          prizeCategoryId: dto.prizeCategoryId,
          createdAt: { gte: cooldownDate },
          status: { in: ['OPEN', 'AWARDED'] },
        },
      });

      if (existingNomination) {
        throw new DomainException(
          ERROR_CODES.VALIDATION_ERROR,
          'You have already nominated this peer in this category within the last 30 days',
          HttpStatus.CONFLICT,
        );
      }

      return tx.communityNomination.create({
        data: {
          nominatorId,
          nomineeId: dto.nomineeId,
          prizeCategoryId: dto.prizeCategoryId,
          channelId: dto.channelId,
          rationale: dto.rationale,
          status: 'OPEN',
          expiresAt,
        },
        include: {
          prizeCategory: { select: { id: true, name: true } },
          channel: { select: { id: true, name: true } },
          nominee: { select: { id: true, name: true, domain: true } },
        },
      });
    });

    this.logger.log('Community nomination created', {
      module: 'prizes',
      nominationId: nomination.id,
      nominatorId,
      nomineeId: dto.nomineeId,
      prizeCategoryId: dto.prizeCategoryId,
      channelId: dto.channelId,
      correlationId,
    });

    // 7. Emit activity event
    const nomineeDomain = nomination.nominee.domain;
    await this.activityService.createActivityEvent({
      eventType: 'PEER_NOMINATION_RECEIVED',
      title: `Peer nomination received for ${nomination.prizeCategory.name}`,
      description: `A contributor was nominated in ${nomination.channel.name} for ${nomination.prizeCategory.name}`,
      contributorId: dto.nomineeId,
      domain: nomineeDomain ?? ('TECHNOLOGY' as ContributorDomain),
      entityId: nomination.id,
      metadata: {
        nominationId: nomination.id,
        prizeCategoryId: dto.prizeCategoryId,
        prizeCategoryName: nomination.prizeCategory.name,
        channelId: dto.channelId,
        channelName: nomination.channel.name,
      },
    });

    // 8. Emit notification event (Chatham House — no nominator identity)
    const peerNominationEvent: PeerNominationReceivedEvent = {
      eventType: 'prize.event.peer_nomination_received',
      timestamp: new Date().toISOString(),
      correlationId,
      actorId: nominatorId,
      payload: {
        nominationId: nomination.id,
        nomineeId: dto.nomineeId,
        prizeCategoryId: dto.prizeCategoryId,
        prizeCategoryName: nomination.prizeCategory.name,
        channelId: dto.channelId,
        channelName: nomination.channel.name,
      },
    };

    this.eventEmitter.emit('prize.event.peer_nomination_received', peerNominationEvent);

    return {
      id: nomination.id,
      nomineeId: nomination.nomineeId,
      prizeCategoryId: nomination.prizeCategoryId,
      prizeCategoryName: nomination.prizeCategory.name,
      channelId: nomination.channelId,
      channelName: nomination.channel.name,
      status: nomination.status,
      createdAt: nomination.createdAt.toISOString(),
      expiresAt: nomination.expiresAt.toISOString(),
    };
  }

  async findActive(options?: { limit?: number; cursor?: string; excludeNominatorId?: string }) {
    const limit = options?.limit ?? 20;

    // Lazy expiry: only return non-expired OPEN nominations
    const where = {
      status: 'OPEN' as const,
      expiresAt: { gt: new Date() },
      // Exclude nominations submitted by this contributor (no self-promotion in voting view)
      ...(options?.excludeNominatorId ? { nominatorId: { not: options.excludeNominatorId } } : {}),
    };

    const nominations = await this.prisma.communityNomination.findMany({
      where,
      take: limit + 1,
      ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' as const },
      include: {
        nominee: { select: { id: true, name: true, domain: true } },
        prizeCategory: { select: { id: true, name: true } },
        channel: { select: { id: true, name: true } },
        _count: { select: { votes: true } },
      },
    });

    const hasMore = nominations.length > limit;
    const items = hasMore ? nominations.slice(0, limit) : nominations;

    return {
      items: items.map((n) => ({
        id: n.id,
        nomineeId: n.nomineeId,
        nomineeName: n.nominee.name,
        nomineeDomain: n.nominee.domain,
        prizeCategoryId: n.prizeCategoryId,
        prizeCategoryName: n.prizeCategory.name,
        channelId: n.channelId,
        channelName: n.channel.name,
        rationale: n.rationale,
        status: n.status,
        voteCount: n._count.votes,
        createdAt: n.createdAt.toISOString(),
        expiresAt: n.expiresAt.toISOString(),
        // Chatham House: nominator identity is NOT returned
      })),
      pagination: {
        hasMore,
        cursor: items.length > 0 ? items[items.length - 1].id : undefined,
      },
    };
  }

  async findByNominator(nominatorId: string) {
    const nominations = await this.prisma.communityNomination.findMany({
      where: { nominatorId },
      orderBy: { createdAt: 'desc' },
      include: {
        nominee: { select: { id: true, name: true, domain: true } },
        prizeCategory: { select: { id: true, name: true } },
        channel: { select: { id: true, name: true } },
      },
    });

    return nominations.map((n) => ({
      id: n.id,
      nomineeId: n.nomineeId,
      nomineeName: n.nominee.name,
      nomineeDomain: n.nominee.domain,
      prizeCategoryId: n.prizeCategoryId,
      prizeCategoryName: n.prizeCategory.name,
      channelId: n.channelId,
      channelName: n.channel.name,
      rationale: n.rationale,
      status: n.status,
      createdAt: n.createdAt.toISOString(),
      expiresAt: n.expiresAt.toISOString(),
    }));
  }

  async findByNominee(nomineeId: string) {
    const nominations = await this.prisma.communityNomination.findMany({
      where: { nomineeId },
      orderBy: { createdAt: 'desc' },
      include: {
        prizeCategory: { select: { id: true, name: true } },
        channel: { select: { id: true, name: true } },
        // Chatham House: nominator identity is NOT returned
      },
    });

    return nominations.map((n) => ({
      id: n.id,
      prizeCategoryId: n.prizeCategoryId,
      prizeCategoryName: n.prizeCategory.name,
      channelId: n.channelId,
      channelName: n.channel.name,
      // Chatham House: rationale is NOT returned to nominee — nominator's words could identify them
      status: n.status,
      createdAt: n.createdAt.toISOString(),
      expiresAt: n.expiresAt.toISOString(),
    }));
  }

  async withdraw(nominationId: string, nominatorId: string) {
    const nomination = await this.prisma.communityNomination.findUnique({
      where: { id: nominationId },
    });

    if (!nomination) {
      throw new DomainException(
        ERROR_CODES.NOT_FOUND,
        'Nomination not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (nomination.nominatorId !== nominatorId) {
      throw new DomainException(
        ERROR_CODES.FORBIDDEN,
        'Only the nominator can withdraw a nomination',
        HttpStatus.FORBIDDEN,
      );
    }

    if (nomination.status !== 'OPEN') {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        `Cannot withdraw a nomination with status ${nomination.status}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const updated = await this.prisma.communityNomination.update({
      where: { id: nominationId },
      data: { status: 'WITHDRAWN' },
    });

    this.logger.log('Community nomination withdrawn', {
      module: 'prizes',
      nominationId,
      nominatorId,
    });

    return { id: updated.id, status: updated.status };
  }

  async expireStaleNominations(): Promise<number> {
    const result = await this.prisma.communityNomination.updateMany({
      where: {
        status: 'OPEN',
        expiresAt: { lte: new Date() },
      },
      data: { status: 'EXPIRED' },
    });

    if (result.count > 0) {
      this.logger.log(`Expired ${result.count} stale community nominations`, {
        module: 'prizes',
        count: result.count,
      });
    }

    return result.count;
  }
}

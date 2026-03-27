import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ActivityService } from '../activity/activity.service.js';
import { randomUUID } from 'crypto';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { ERROR_CODES } from '@edin/shared';
import type { NominationVoteCastEvent } from '@edin/shared';
import type { ContributorDomain } from '../../../generated/prisma/client/enums.js';

@Injectable()
export class NominationVotingService {
  private readonly logger = new Logger(NominationVotingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly activityService: ActivityService,
  ) {}

  async castVote(voterId: string, nominationId: string) {
    const correlationId = randomUUID();

    // All validation + creation inside a single transaction to prevent TOCTOU
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Load nomination with relations for validation (inside tx for consistency)
      const nomination = await tx.communityNomination.findUnique({
        where: { id: nominationId },
        include: {
          nominee: { select: { id: true, name: true, domain: true } },
          prizeCategory: { select: { id: true, name: true } },
          channel: { select: { id: true, name: true } },
        },
      });

      if (!nomination) {
        throw new DomainException(
          ERROR_CODES.NOMINATION_NOT_FOUND,
          'Nomination not found',
          HttpStatus.NOT_FOUND,
        );
      }

      // 2. Nomination must be OPEN and not expired
      if (nomination.status !== 'OPEN' || nomination.expiresAt <= new Date()) {
        throw new DomainException(
          ERROR_CODES.NOMINATION_EXPIRED_VOTING_CLOSED,
          'This nomination is no longer open for voting',
          HttpStatus.BAD_REQUEST,
        );
      }

      // 3. Voter cannot be the nominator (no self-promotion)
      if (nomination.nominatorId === voterId) {
        throw new DomainException(
          ERROR_CODES.CANNOT_VOTE_AS_NOMINATOR,
          'You cannot vote on a nomination you submitted',
          HttpStatus.FORBIDDEN,
        );
      }

      // 4. Voter cannot be the nominee (cannot vote on own nomination)
      if (nomination.nomineeId === voterId) {
        throw new DomainException(
          ERROR_CODES.CANNOT_VOTE_ON_OWN_NOMINATION,
          'You cannot vote on your own nomination',
          HttpStatus.FORBIDDEN,
        );
      }

      // 5. Check for existing vote
      const existingVote = await tx.nominationVote.findUnique({
        where: {
          nominationId_voterId: { nominationId, voterId },
        },
      });

      if (existingVote) {
        throw new DomainException(
          ERROR_CODES.ALREADY_VOTED_ON_NOMINATION,
          'You have already voted on this nomination',
          HttpStatus.CONFLICT,
        );
      }

      const vote = await tx.nominationVote.create({
        data: { nominationId, voterId },
      });

      const voteCount = await tx.nominationVote.count({
        where: { nominationId },
      });

      return { vote, voteCount, nomination };
    });

    const nomination = result.nomination;

    this.logger.log('Nomination vote cast', {
      module: 'prizes',
      voteId: result.vote.id,
      nominationId,
      voterId,
      voteCount: result.voteCount,
      correlationId,
    });

    // 6. Emit activity event
    const nomineeDomain = nomination.nominee.domain;
    await this.activityService.createActivityEvent({
      eventType: 'NOMINATION_VOTE_CAST',
      title: `Vote cast on nomination for ${nomination.prizeCategory.name}`,
      description: `A community member voted on a nomination in ${nomination.channel.name}`,
      contributorId: voterId,
      domain: nomineeDomain ?? ('TECHNOLOGY' as ContributorDomain),
      entityId: nomination.id,
      metadata: {
        voteId: result.vote.id,
        nominationId,
        nomineeId: nomination.nomineeId,
        prizeCategoryName: nomination.prizeCategory.name,
        channelName: nomination.channel.name,
        currentVoteCount: result.voteCount,
      },
    });

    // 7. Emit event for SSE real-time update
    const voteCastEvent: NominationVoteCastEvent = {
      eventType: 'prize.event.nomination_vote_cast',
      timestamp: new Date().toISOString(),
      correlationId,
      actorId: voterId,
      payload: {
        voteId: result.vote.id,
        nominationId,
        voterId,
        nomineeId: nomination.nomineeId,
        prizeCategoryName: nomination.prizeCategory.name,
        channelName: nomination.channel.name,
        currentVoteCount: result.voteCount,
      },
    };

    this.eventEmitter.emit('prize.event.nomination_vote_cast', voteCastEvent);

    return {
      voteId: result.vote.id,
      nominationId,
      currentVoteCount: result.voteCount,
    };
  }

  async getVoteCount(nominationId: string): Promise<{ nominationId: string; voteCount: number }> {
    const count = await this.prisma.nominationVote.count({
      where: { nominationId },
    });

    return { nominationId, voteCount: count };
  }

  async hasVoted(voterId: string, nominationId: string): Promise<boolean> {
    const vote = await this.prisma.nominationVote.findUnique({
      where: {
        nominationId_voterId: { nominationId, voterId },
      },
      select: { id: true },
    });

    return vote !== null;
  }

  async getVotedNominationIds(voterId: string, nominationIds: string[]): Promise<Set<string>> {
    if (nominationIds.length === 0) return new Set();

    const votes = await this.prisma.nominationVote.findMany({
      where: {
        voterId,
        nominationId: { in: nominationIds },
      },
      select: { nominationId: true },
    });

    return new Set(votes.map((v) => v.nominationId));
  }
}

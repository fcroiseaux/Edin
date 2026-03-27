import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseUUIDPipe,
  Req,
  UseGuards,
  Logger,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { Action } from '../auth/casl/action.enum.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { NominationVotingService } from './nomination-voting.service.js';

@Controller({ path: 'community-nominations', version: '1' })
export class NominationVotingController {
  private readonly logger = new Logger(NominationVotingController.name);

  constructor(private readonly votingService: NominationVotingService) {}

  @Post(':nominationId/votes')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Create, 'NominationVote'))
  async castVote(
    @Param('nominationId', ParseUUIDPipe) nominationId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const result = await this.votingService.castVote(user.id, nominationId);
    return createSuccessResponse(result, req.correlationId || 'unknown');
  }

  @Get(':nominationId/votes/count')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'NominationVote'))
  async getVoteCount(
    @Param('nominationId', ParseUUIDPipe) nominationId: string,
    @Req() req: Request,
  ) {
    const result = await this.votingService.getVoteCount(nominationId);
    return createSuccessResponse(result, req.correlationId || 'unknown');
  }

  @Get(':nominationId/votes/mine')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'NominationVote'))
  async hasVoted(
    @Param('nominationId', ParseUUIDPipe) nominationId: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const hasVoted = await this.votingService.hasVoted(user.id, nominationId);
    return createSuccessResponse({ hasVoted }, req.correlationId || 'unknown');
  }

  @Get('votes/batch')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'NominationVote'))
  async getVotedNominationIds(
    @Query('ids') ids: string | undefined,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const nominationIds = ids ? ids.split(',').filter(Boolean) : [];
    const votedIds = await this.votingService.getVotedNominationIds(user.id, nominationIds);
    return createSuccessResponse(
      { votedNominationIds: Array.from(votedIds) },
      req.correlationId || 'unknown',
    );
  }
}

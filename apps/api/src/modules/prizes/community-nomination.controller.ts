import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  Req,
  UseGuards,
  Logger,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import type { Request } from 'express';
import { createNominationSchema, ERROR_CODES } from '@edin/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { Action } from '../auth/casl/action.enum.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { CommunityNominationService } from './community-nomination.service.js';

@Controller({ path: 'community-nominations', version: '1' })
export class CommunityNominationController {
  private readonly logger = new Logger(CommunityNominationController.name);

  constructor(private readonly nominationService: CommunityNominationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Create, 'CommunityNomination'))
  async create(
    @Body() body: unknown,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const parsed = createNominationSchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid nomination data',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const result = await this.nominationService.create(user.id, parsed.data);
    return createSuccessResponse(result, req.correlationId || 'unknown');
  }

  @Get('active')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'CommunityNomination'))
  async findActive(
    @Query('limit') limit: string | undefined,
    @Query('cursor') cursor: string | undefined,
    @Query('excludeOwn') excludeOwn: string | undefined,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100) : undefined;
    const result = await this.nominationService.findActive({
      limit: parsedLimit,
      cursor,
      excludeNominatorId: excludeOwn === 'true' ? user.id : undefined,
    });

    return createSuccessResponse(result.items, req.correlationId || 'unknown', {
      hasMore: result.pagination.hasMore,
      cursor: result.pagination.cursor ?? null,
      total: result.items.length,
    });
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'CommunityNomination'))
  async findMine(@CurrentUser() user: CurrentUserPayload, @Req() req: Request) {
    const result = await this.nominationService.findByNominator(user.id);
    return createSuccessResponse(result, req.correlationId || 'unknown');
  }

  @Get('received')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'CommunityNomination'))
  async findReceived(@CurrentUser() user: CurrentUserPayload, @Req() req: Request) {
    const result = await this.nominationService.findByNominee(user.id);
    return createSuccessResponse(result, req.correlationId || 'unknown');
  }

  @Patch(':id/withdraw')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Update, 'CommunityNomination'))
  async withdraw(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const result = await this.nominationService.withdraw(id, user.id);
    return createSuccessResponse(result, req.correlationId || 'unknown');
  }
}

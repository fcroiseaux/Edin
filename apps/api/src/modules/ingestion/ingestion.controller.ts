import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Headers,
  HttpStatus,
  HttpCode,
  UseGuards,
  RawBodyRequest,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { ERROR_CODES } from '@edin/shared';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { Action } from '../auth/casl/action.enum.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { IngestionService } from './ingestion.service.js';
import { addRepositorySchema } from './dto/add-repository.dto.js';
import { listRepositoriesQuerySchema } from './dto/list-repositories-query.dto.js';
import { Logger } from '@nestjs/common';

@Controller({ path: 'ingestion', version: '1' })
export class IngestionController {
  private readonly logger = new Logger(IngestionController.name);

  constructor(private readonly ingestionService: IngestionService) {}

  // ─── Webhook endpoint (NO JWT auth — uses HMAC signature validation) ───

  @Post('github/webhook')
  @Throttle({ default: { ttl: 1000, limit: 100 } })
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Headers('x-github-event') eventType: string | undefined,
    @Headers('x-github-delivery') deliveryId: string | undefined,
    @Req() req: RawBodyRequest<Request>,
  ) {
    if (!signature || !eventType) {
      throw new DomainException(
        ERROR_CODES.WEBHOOK_VALIDATION_FAILED,
        'Missing required webhook headers',
        HttpStatus.BAD_REQUEST,
      );
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new DomainException(
        ERROR_CODES.WEBHOOK_VALIDATION_FAILED,
        'Missing request body',
        HttpStatus.BAD_REQUEST,
      );
    }

    const body = JSON.parse(rawBody.toString()) as Record<string, unknown>;
    const repository = body.repository as Record<string, unknown> | undefined;
    const repositoryFullName = repository?.full_name as string | undefined;

    if (!repositoryFullName) {
      throw new DomainException(
        ERROR_CODES.WEBHOOK_VALIDATION_FAILED,
        'Missing repository information in payload',
        HttpStatus.BAD_REQUEST,
      );
    }

    const isValid = await this.ingestionService.validateWebhookSignature(
      rawBody,
      signature,
      repositoryFullName,
    );

    if (!isValid) {
      this.logger.warn('Webhook signature validation failed', {
        repository: repositoryFullName,
        eventType,
        deliveryId,
        correlationId: req.correlationId,
      });

      throw new DomainException(
        ERROR_CODES.WEBHOOK_VALIDATION_FAILED,
        'Invalid webhook signature',
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.ingestionService.dispatchWebhookEvent(
      eventType,
      repositoryFullName,
      body,
      deliveryId || 'unknown',
    );

    return { status: 'accepted' };
  }

  // ─── Admin repository management endpoints (JWT + CASL) ────────────────

  @Post('repositories')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Manage, 'MonitoredRepository'))
  async addRepository(
    @Body() body: unknown,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const parsed = addRepositorySchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid repository data',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const result = await this.ingestionService.addRepository(
      parsed.data,
      user.id,
      req.correlationId,
    );

    return createSuccessResponse(result, req.correlationId || 'unknown');
  }

  @Get('repositories')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Manage, 'MonitoredRepository'))
  async listRepositories(@Query() query: unknown, @Req() req: Request) {
    const parsed = listRepositoriesQuerySchema.safeParse(query);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const result = await this.ingestionService.listRepositories(parsed.data, req.correlationId);

    return createSuccessResponse(result.items, req.correlationId || 'unknown', result.pagination);
  }

  @Get('repositories/:id')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Manage, 'MonitoredRepository'))
  async getRepository(@Param('id') id: string, @Req() req: Request) {
    const result = await this.ingestionService.getRepository(id, req.correlationId);
    return createSuccessResponse(result, req.correlationId || 'unknown');
  }

  @Delete('repositories/:id')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Manage, 'MonitoredRepository'))
  async removeRepository(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    await this.ingestionService.removeRepository(id, user.id, req.correlationId);
    return createSuccessResponse({ deleted: true }, req.correlationId || 'unknown');
  }

  @Post('repositories/:id/retry')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Manage, 'MonitoredRepository'))
  async retryWebhook(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    const result = await this.ingestionService.retryWebhook(id, user.id, req.correlationId);
    return createSuccessResponse(result, req.correlationId || 'unknown');
  }
}

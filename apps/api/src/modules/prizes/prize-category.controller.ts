import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { ERROR_CODES, createPrizeCategorySchema, updatePrizeCategorySchema } from '@edin/shared';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator.js';
import { Action } from '../auth/casl/action.enum.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { PrizeCategoryService } from './prize-category.service.js';

@Controller({ path: 'prize-categories', version: '1' })
export class PrizeCategoryController {
  private readonly logger = new Logger(PrizeCategoryController.name);

  constructor(private readonly prizeCategoryService: PrizeCategoryService) {}

  @Get()
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'PrizeCategory'))
  async findAll(
    @Query('includeInactive') includeInactive: string | undefined,
    @CurrentUser() user: CurrentUserPayload,
    @Req() req: Request,
  ) {
    // Only admins can see inactive categories
    const showInactive = includeInactive === 'true' && user.role === 'ADMIN';
    const categories = await this.prizeCategoryService.findAll(showInactive);

    return createSuccessResponse(
      categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        channelId: c.channelId,
        channel: c.channel,
        detectionType: c.detectionType,
        thresholdConfig: c.thresholdConfig,
        scalingConfig: c.scalingConfig,
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
      req.correlationId || 'unknown',
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'PrizeCategory'))
  async findById(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    const category = await this.prizeCategoryService.findById(id);

    return createSuccessResponse(
      {
        id: category.id,
        name: category.name,
        description: category.description,
        channelId: category.channelId,
        channel: category.channel,
        detectionType: category.detectionType,
        thresholdConfig: category.thresholdConfig,
        scalingConfig: category.scalingConfig,
        isActive: category.isActive,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      },
      req.correlationId || 'unknown',
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Manage, 'PrizeCategory'))
  async create(@Body() body: unknown, @Req() req: Request) {
    const parsed = createPrizeCategorySchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid prize category data',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    this.logger.log('Creating prize category', {
      name: parsed.data.name,
      correlationId: req.correlationId,
      module: 'prizes',
    });

    const category = await this.prizeCategoryService.create(parsed.data);

    return createSuccessResponse(
      {
        id: category.id,
        name: category.name,
        description: category.description,
        channelId: category.channelId,
        detectionType: category.detectionType,
        thresholdConfig: category.thresholdConfig,
        scalingConfig: category.scalingConfig,
        isActive: category.isActive,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      },
      req.correlationId || 'unknown',
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Manage, 'PrizeCategory'))
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = updatePrizeCategorySchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid prize category data',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    this.logger.log('Updating prize category', {
      categoryId: id,
      correlationId: req.correlationId,
      module: 'prizes',
    });

    const category = await this.prizeCategoryService.update(id, parsed.data);

    return createSuccessResponse(
      {
        id: category.id,
        name: category.name,
        description: category.description,
        channelId: category.channelId,
        channel: category.channel,
        detectionType: category.detectionType,
        thresholdConfig: category.thresholdConfig,
        scalingConfig: category.scalingConfig,
        isActive: category.isActive,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      },
      req.correlationId || 'unknown',
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Manage, 'PrizeCategory'))
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: Request) {
    this.logger.log('Deleting prize category', {
      categoryId: id,
      correlationId: req.correlationId,
      module: 'prizes',
    });

    await this.prizeCategoryService.delete(id);
  }
}

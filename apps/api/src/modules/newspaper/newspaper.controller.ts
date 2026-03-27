import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Logger,
  HttpStatus,
  HttpCode,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Action } from '../auth/casl/action.enum.js';
import { AuditService } from '../compliance/audit/audit.service.js';
import { ERROR_CODES } from '@edin/shared';
import { newspaperEditionsQuerySchema } from './dto/newspaper-edition.dto.js';
import { newspaperItemsQuerySchema } from './dto/newspaper-item.dto.js';
import { bulkEditorialRankUpdateSchema } from './dto/editorial-curation.dto.js';
import type {
  NewspaperEditionDto,
  NewspaperEditionWithItemsDto,
  NewspaperItemSummaryDto,
  EditionChannelDto,
  NewspaperEditionItemsResponseDto,
} from './dto/newspaper-edition.dto.js';
import type { NewspaperItemDto } from './dto/newspaper-item.dto.js';
import type { ReferenceScaleDto } from './dto/reference-scale.dto.js';
import type {
  EditorialCurationResultDto,
  EditorialAuditEntryDto,
  NewspaperItemVoteResultDto,
  NewspaperItemVoteStatusDto,
  NewspaperItemBatchVoteStatusDto,
} from '@edin/shared';
import { NewspaperItemVotingService } from './newspaper-item-voting.service.js';
import type { Decimal } from '../../../generated/prisma/client/internal/prismaNamespace.js';
import { IntrinsicTimeService } from './intrinsic-time.service.js';

@Controller({ path: 'newspaper', version: '1' })
export class NewspaperController {
  private readonly logger = new Logger(NewspaperController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly intrinsicTimeService: IntrinsicTimeService,
    private readonly auditService: AuditService,
    private readonly votingService: NewspaperItemVotingService,
  ) {}

  @Get('editions')
  async listEditions(@Query() rawQuery: Record<string, unknown>) {
    const correlationId = randomUUID();
    const parsed = newspaperEditionsQuerySchema.safeParse(rawQuery);

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

    const { cursor, limit, status } = parsed.data;

    const where: Record<string, unknown> = { status };
    if (cursor) {
      const separatorIdx = cursor.lastIndexOf('|');
      if (separatorIdx > 0) {
        const cursorNumber = parseInt(cursor.slice(0, separatorIdx), 10);
        const cursorId = cursor.slice(separatorIdx + 1);
        where.OR = [
          { editionNumber: { lt: cursorNumber } },
          { editionNumber: cursorNumber, id: { lt: cursorId } },
        ];
      }
    }

    const editions = await this.prisma.newspaperEdition.findMany({
      where,
      orderBy: [{ editionNumber: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        _count: { select: { items: true } },
      },
    });

    const hasMore = editions.length > limit;
    const resultEditions = hasMore ? editions.slice(0, limit) : editions;
    const lastEdition = resultEditions[resultEditions.length - 1];
    const nextCursor =
      hasMore && lastEdition ? `${lastEdition.editionNumber}|${lastEdition.id}` : null;

    const total = await this.prisma.newspaperEdition.count({ where: { status } });

    const data: NewspaperEditionDto[] = resultEditions.map((e) =>
      this.mapEditionToDto(e, e._count.items),
    );

    this.logger.log('Listed newspaper editions', {
      module: 'newspaper',
      status,
      count: data.length,
      correlationId,
    });

    return createSuccessResponse(data, correlationId, {
      cursor: nextCursor,
      hasMore,
      total,
    });
  }

  @Get('editions/latest')
  async getLatestEdition() {
    const correlationId = randomUUID();

    const edition = await this.prisma.newspaperEdition.findFirst({
      where: { status: 'PUBLISHED' },
      orderBy: { editionNumber: 'desc' },
      include: {
        items: {
          orderBy: [{ algorithmicRank: 'asc' }],
          include: {
            channel: { select: { name: true } },
          },
        },
      },
    });

    if (!edition) {
      throw new NotFoundException('No published newspaper editions found');
    }

    // Fetch all active channels (including those with 0 items in this edition)
    const allChannels = await this.prisma.channel.findMany({
      where: { isActive: true },
      select: { id: true, name: true, type: true },
      orderBy: { name: 'asc' },
    });

    // Compute per-edition item counts by channel
    const channelItemCounts = new Map<string, number>();
    for (const item of edition.items) {
      channelItemCounts.set(item.channelId, (channelItemCounts.get(item.channelId) ?? 0) + 1);
    }

    const channels: EditionChannelDto[] = allChannels.map((ch) => ({
      channelId: ch.id,
      channelName: ch.name,
      channelType: ch.type,
      itemCount: channelItemCounts.get(ch.id) ?? 0,
    }));

    const data: NewspaperEditionWithItemsDto = {
      ...this.mapEditionToDto(edition, edition.items.length),
      items: edition.items.map((item) => this.mapItemToSummaryDto(item)),
      channels,
    };

    this.logger.log('Fetched latest newspaper edition', {
      module: 'newspaper',
      editionNumber: edition.editionNumber,
      itemCount: edition.items.length,
      channelCount: channels.length,
      correlationId,
    });

    return createSuccessResponse(data, correlationId);
  }

  @Get('editions/:id/scale')
  async getEditionScale(@Param('id') editionId: string) {
    const correlationId = randomUUID();

    const edition = await this.prisma.newspaperEdition.findUnique({
      where: { id: editionId },
    });

    if (!edition) {
      throw new NotFoundException(`Newspaper edition ${editionId} not found`);
    }

    const sigDist = edition.significanceDistribution as Record<string, number> | null;
    const normalisedMeta = NewspaperController.normaliseRefMeta(edition.referenceScaleMetadata);
    const isQuietPeriod = normalisedMeta.comparisonContext.includes('Low activity period');

    const { activityLevel, densityRatio } = isQuietPeriod
      ? { activityLevel: 'low' as const, densityRatio: null }
      : await this.intrinsicTimeService.computeDensityComparison(
          Number(edition.eventDensity),
          edition.id,
        );

    const data: ReferenceScaleDto = {
      editionId: edition.id,
      editionNumber: edition.editionNumber,
      temporalSpanStart: edition.temporalSpanStart.toISOString(),
      temporalSpanEnd: edition.temporalSpanEnd.toISOString(),
      eventCount: edition.eventCount,
      eventDensity: Number(edition.eventDensity),
      significanceDistribution: sigDist ?? {},
      referenceScaleMetadata: normalisedMeta,
      isQuietPeriod,
      activityLevel,
      densityRatio,
    };

    this.logger.log('Fetched edition reference scale', {
      module: 'newspaper',
      editionId,
      activityLevel,
      correlationId,
    });

    return createSuccessResponse(data, correlationId);
  }

  @Get('editions/:id/items')
  async getEditionItems(
    @Param('id') editionId: string,
    @Query() rawQuery: Record<string, unknown>,
  ) {
    const correlationId = randomUUID();
    const parsed = newspaperItemsQuerySchema.safeParse(rawQuery);

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

    const edition = await this.prisma.newspaperEdition.findUnique({
      where: { id: editionId },
    });

    if (!edition) {
      throw new NotFoundException(`Newspaper edition ${editionId} not found`);
    }

    const itemWhere: Record<string, unknown> = { editionId };
    if (parsed.data.channelId) {
      itemWhere.channelId =
        parsed.data.channelId.length === 1
          ? parsed.data.channelId[0]
          : { in: parsed.data.channelId };
    }

    const items = await this.prisma.newspaperItem.findMany({
      where: itemWhere,
      orderBy: [{ algorithmicRank: 'asc' }],
      include: {
        channel: { select: { name: true } },
      },
    });

    // Apply effective ranking: editorial_rank_override takes precedence
    const sortedItems = [...items].sort((a, b) => {
      const rankA = a.editorialRankOverride ?? a.algorithmicRank;
      const rankB = b.editorialRankOverride ?? b.algorithmicRank;
      return rankA - rankB;
    });

    const mappedItems: NewspaperItemDto[] = sortedItems.map((item) => ({
      id: item.id,
      editionId: item.editionId,
      sourceEventType: item.sourceEventType,
      channelId: item.channelId,
      channelName: item.channel.name,
      headline: item.headline,
      body: item.body,
      chathamHouseLabel: item.chathamHouseLabel,
      significanceScore: item.significanceScore,
      rank: item.editorialRankOverride ?? item.algorithmicRank,
      communityVoteCount: item.communityVoteCount,
      createdAt: item.createdAt.toISOString(),
    }));

    // Fetch all active channels with per-edition item counts
    const allChannels = await this.prisma.channel.findMany({
      where: { isActive: true },
      select: { id: true, name: true, type: true },
      orderBy: { name: 'asc' },
    });

    // Count items per channel from the full (unfiltered) edition item set
    const allEditionItems = parsed.data.channelId
      ? await this.prisma.newspaperItem.findMany({
          where: { editionId },
          select: { channelId: true },
        })
      : items; // When no filter applied, reuse the already-fetched items

    const channelCountMap = new Map<string, number>();
    for (const item of allEditionItems) {
      channelCountMap.set(item.channelId, (channelCountMap.get(item.channelId) ?? 0) + 1);
    }

    const channels: EditionChannelDto[] = allChannels.map((ch) => ({
      channelId: ch.id,
      channelName: ch.name,
      channelType: ch.type,
      itemCount: channelCountMap.get(ch.id) ?? 0,
    }));

    const data: NewspaperEditionItemsResponseDto = {
      items: mappedItems,
      channels,
    };

    this.logger.log('Fetched newspaper edition items', {
      module: 'newspaper',
      editionId,
      itemCount: mappedItems.length,
      channelCount: channels.length,
      channelFilter: parsed.data.channelId ?? 'none',
      correlationId,
    });

    return createSuccessResponse(data, correlationId);
  }

  @Patch('editions/:editionId/curation')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Update, 'NewspaperItem'))
  async updateEditorialCuration(
    @Param('editionId') editionId: string,
    @Body() body: unknown,
    @CurrentUser('id') editorId: string,
  ) {
    const correlationId = randomUUID();
    const parsed = bulkEditorialRankUpdateSchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid editorial curation payload',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const edition = await this.prisma.newspaperEdition.findUnique({
      where: { id: editionId },
    });

    if (!edition) {
      throw new NotFoundException(`Newspaper edition ${editionId} not found`);
    }

    if (edition.status !== 'PUBLISHED' && edition.status !== 'DRAFT') {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Only PUBLISHED or DRAFT editions can be curated',
        HttpStatus.BAD_REQUEST,
      );
    }

    const itemIds = parsed.data.items.map((i) => i.itemId);
    const existingItems = await this.prisma.newspaperItem.findMany({
      where: { id: { in: itemIds }, editionId },
      select: { id: true, editorialRankOverride: true },
    });

    const existingMap = new Map(existingItems.map((i) => [i.id, i.editorialRankOverride]));
    const missingIds = itemIds.filter((id) => !existingMap.has(id));

    if (missingIds.length > 0) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        `Items not found in edition: ${missingIds.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const itemChanges: Array<{
      itemId: string;
      previousRank: number | null;
      newRank: number | null;
    }> = [];

    await this.prisma.$transaction(async (tx) => {
      for (const item of parsed.data.items) {
        const previousRank = existingMap.get(item.itemId) ?? null;
        await tx.newspaperItem.update({
          where: { id: item.itemId },
          data: { editorialRankOverride: item.editorialRankOverride },
        });
        itemChanges.push({
          itemId: item.itemId,
          previousRank,
          newRank: item.editorialRankOverride,
        });
      }

      await this.auditService.log(
        {
          actorId: editorId,
          action: 'NEWSPAPER_EDITORIAL_CURATION',
          entityType: 'NEWSPAPER_EDITION',
          entityId: editionId,
          previousState: Object.fromEntries(itemChanges.map((c) => [c.itemId, c.previousRank])),
          newState: Object.fromEntries(itemChanges.map((c) => [c.itemId, c.newRank])),
          details: { itemChanges },
          correlationId,
        },
        tx as never,
      );
    });

    const data: EditorialCurationResultDto = {
      editionId,
      updatedItems: itemChanges,
    };

    this.logger.log('Editorial curation applied', {
      module: 'newspaper',
      editionId,
      editorId,
      itemCount: itemChanges.length,
      correlationId,
    });

    return createSuccessResponse(data, correlationId);
  }

  @Get('editions/:editionId/audit')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Update, 'NewspaperItem'))
  async getEditorialAuditHistory(@Param('editionId') editionId: string) {
    const correlationId = randomUUID();

    const edition = await this.prisma.newspaperEdition.findUnique({
      where: { id: editionId },
      select: { id: true },
    });

    if (!edition) {
      throw new NotFoundException(`Newspaper edition ${editionId} not found`);
    }

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        entityType: 'NEWSPAPER_EDITION',
        entityId: editionId,
        action: 'NEWSPAPER_EDITORIAL_CURATION',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const data: EditorialAuditEntryDto[] = auditLogs.map((log) => ({
      id: log.id,
      editorId: log.actorId ?? '',
      editorRole: log.actorRole ?? null,
      editionId: log.entityId,
      action: log.action,
      itemChanges:
        ((log.details as Record<string, unknown>)
          ?.itemChanges as EditorialAuditEntryDto['itemChanges']) ?? [],
      createdAt: log.createdAt.toISOString(),
    }));

    this.logger.log('Fetched editorial audit history', {
      module: 'newspaper',
      editionId,
      entryCount: data.length,
      correlationId,
    });

    return createSuccessResponse(data, correlationId);
  }

  @Post('items/:itemId/votes')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Create, 'NewspaperItemVote'))
  async castItemVote(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: { contributorId: string },
  ) {
    const correlationId = randomUUID();
    const result: NewspaperItemVoteResultDto = await this.votingService.castVote(
      user.contributorId,
      itemId,
    );

    this.logger.log('Newspaper item vote endpoint called', {
      module: 'newspaper',
      itemId,
      voterId: user.contributorId,
      correlationId,
    });

    return createSuccessResponse(result, correlationId);
  }

  @Get('items/:itemId/votes/mine')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'NewspaperItemVote'))
  async hasVotedOnItem(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @CurrentUser() user: { contributorId: string },
  ) {
    const correlationId = randomUUID();
    const hasVoted = await this.votingService.hasVoted(user.contributorId, itemId);
    const data: NewspaperItemVoteStatusDto = { hasVoted };
    return createSuccessResponse(data, correlationId);
  }

  @Get('items/votes/batch')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'NewspaperItemVote'))
  async getVotedItemIds(
    @Query('ids') ids: string | undefined,
    @CurrentUser() user: { contributorId: string },
  ) {
    const correlationId = randomUUID();
    const itemIds = ids ? ids.split(',').filter(Boolean) : [];
    const votedIds = await this.votingService.getVotedItemIds(user.contributorId, itemIds);
    const data: NewspaperItemBatchVoteStatusDto = { votedItemIds: Array.from(votedIds) };
    return createSuccessResponse(data, correlationId);
  }

  /**
   * Normalises the reference_scale_metadata JSON stored in the DB.
   * The IntrinsicTimeService writes snake_case keys; the API exposes camelCase.
   * Handles either convention for backwards compatibility.
   */
  private static normaliseRefMeta(raw: unknown): {
    temporalSpanHumanReadable: string;
    significanceSummary: string;
    comparisonContext: string;
  } {
    const meta = raw as Record<string, string> | null;
    return {
      temporalSpanHumanReadable:
        meta?.temporalSpanHumanReadable ?? meta?.temporal_span_human_readable ?? '',
      significanceSummary: meta?.significanceSummary ?? meta?.significance_summary ?? '',
      comparisonContext: meta?.comparisonContext ?? meta?.comparison_context ?? '',
    };
  }

  private mapEditionToDto(
    edition: {
      id: string;
      editionNumber: number;
      status: string;
      temporalSpanStart: Date;
      temporalSpanEnd: Date;
      eventCount: number;
      eventDensity: Decimal;
      significanceDistribution: unknown;
      referenceScaleMetadata: unknown;
      publishedAt: Date | null;
    },
    itemCount: number,
  ): NewspaperEditionDto {
    const sigDist = edition.significanceDistribution as Record<string, number> | null;

    return {
      id: edition.id,
      editionNumber: edition.editionNumber,
      status: edition.status,
      temporalSpanStart: edition.temporalSpanStart.toISOString(),
      temporalSpanEnd: edition.temporalSpanEnd.toISOString(),
      eventCount: edition.eventCount,
      eventDensity: Number(edition.eventDensity),
      significanceDistribution: sigDist ?? {},
      referenceScaleMetadata: NewspaperController.normaliseRefMeta(edition.referenceScaleMetadata),
      publishedAt: edition.publishedAt?.toISOString() ?? null,
      itemCount,
    };
  }

  private mapItemToSummaryDto(item: {
    id: string;
    sourceEventType: string;
    channelId: string;
    channel: { name: string };
    headline: string;
    body: string;
    chathamHouseLabel: string;
    significanceScore: number;
    algorithmicRank: number;
    editorialRankOverride: number | null;
    communityVoteCount: number;
    createdAt: Date;
  }): NewspaperItemSummaryDto {
    return {
      id: item.id,
      sourceEventType: item.sourceEventType,
      channelId: item.channelId,
      channelName: item.channel.name,
      headline: item.headline,
      body: item.body,
      chathamHouseLabel: item.chathamHouseLabel,
      significanceScore: item.significanceScore,
      rank: item.editorialRankOverride ?? item.algorithmicRank,
      communityVoteCount: item.communityVoteCount,
      createdAt: item.createdAt.toISOString(),
    };
  }
}

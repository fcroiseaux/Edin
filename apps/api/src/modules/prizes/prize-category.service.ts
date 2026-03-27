import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '@edin/shared';
import type { CreatePrizeCategoryDto, UpdatePrizeCategoryDto } from '@edin/shared';
import { Prisma } from '../../../generated/prisma/client/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

@Injectable()
export class PrizeCategoryService {
  private readonly logger = new Logger(PrizeCategoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    this.logger.log('Fetching all prize categories', { module: 'prizes' });

    return this.prisma.prizeCategory.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        channel: { select: { id: true, name: true, type: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const category = await this.prisma.prizeCategory.findUnique({
      where: { id },
      include: {
        channel: { select: { id: true, name: true, type: true } },
      },
    });

    if (!category) {
      throw new DomainException(
        ERROR_CODES.PRIZE_CATEGORY_NOT_FOUND,
        'Prize category not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return category;
  }

  async create(dto: CreatePrizeCategoryDto) {
    this.logger.log('Creating prize category', {
      name: dto.name,
      detectionType: dto.detectionType,
      module: 'prizes',
    });

    try {
      return await this.prisma.prizeCategory.create({
        data: {
          name: dto.name,
          description: dto.description,
          channelId: dto.channelId ?? null,
          detectionType: dto.detectionType,
          thresholdConfig: dto.thresholdConfig as unknown as Prisma.InputJsonValue,
          scalingConfig: dto.scalingConfig as unknown as Prisma.InputJsonValue,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2002') {
        throw new DomainException(
          ERROR_CODES.PRIZE_CATEGORY_ALREADY_EXISTS,
          `Prize category with name "${dto.name}" already exists`,
          HttpStatus.CONFLICT,
        );
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdatePrizeCategoryDto) {
    this.logger.log('Updating prize category', { categoryId: id, module: 'prizes' });

    await this.findById(id);

    try {
      return await this.prisma.prizeCategory.update({
        where: { id },
        data: {
          ...dto,
          thresholdConfig: dto.thresholdConfig
            ? (dto.thresholdConfig as unknown as Prisma.InputJsonValue)
            : undefined,
          scalingConfig: dto.scalingConfig
            ? (dto.scalingConfig as unknown as Prisma.InputJsonValue)
            : undefined,
        } as Prisma.PrizeCategoryUpdateInput,
        include: {
          channel: { select: { id: true, name: true, type: true } },
        },
      });
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2002') {
        throw new DomainException(
          ERROR_CODES.PRIZE_CATEGORY_ALREADY_EXISTS,
          `Prize category with name "${dto.name ?? 'unknown'}" already exists`,
          HttpStatus.CONFLICT,
        );
      }
      throw err;
    }
  }

  async delete(id: string) {
    this.logger.log('Deleting prize category', { categoryId: id, module: 'prizes' });

    await this.findById(id);

    return this.prisma.prizeCategory.delete({ where: { id } });
  }
}

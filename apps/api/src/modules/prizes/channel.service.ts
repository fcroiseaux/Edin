import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { ERROR_CODES } from '@edin/shared';
import type { CreateChannelDto, UpdateChannelDto } from '@edin/shared';
import { Prisma } from '../../../generated/prisma/client/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

@Injectable()
export class ChannelService {
  private readonly logger = new Logger(ChannelService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(includeInactive = false) {
    this.logger.log('Fetching all channels', { module: 'prizes' });

    return this.prisma.channel.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id },
      include: {
        parentChannel: { select: { id: true, name: true, type: true } },
        childChannels: { select: { id: true, name: true, type: true } },
      },
    });

    if (!channel) {
      throw new DomainException(
        ERROR_CODES.CHANNEL_NOT_FOUND,
        'Channel not found',
        HttpStatus.NOT_FOUND,
      );
    }

    return channel;
  }

  async create(dto: CreateChannelDto) {
    this.logger.log('Creating channel', { name: dto.name, type: dto.type, module: 'prizes' });

    try {
      return await this.prisma.channel.create({
        data: {
          name: dto.name,
          description: dto.description,
          type: dto.type,
          parentChannelId: dto.parentChannelId ?? null,
          metadata: dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
          isActive: dto.isActive ?? true,
        },
      });
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2002') {
        throw new DomainException(
          ERROR_CODES.CHANNEL_ALREADY_EXISTS,
          `Channel with name "${dto.name}" already exists`,
          HttpStatus.CONFLICT,
        );
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateChannelDto) {
    this.logger.log('Updating channel', { channelId: id, module: 'prizes' });

    await this.findById(id);

    try {
      return await this.prisma.channel.update({
        where: { id },
        data: {
          ...dto,
          metadata: dto.metadata === null ? Prisma.JsonNull : dto.metadata,
        } as Prisma.ChannelUpdateInput,
      });
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2002') {
        throw new DomainException(
          ERROR_CODES.CHANNEL_ALREADY_EXISTS,
          `Channel with name "${dto.name ?? 'unknown'}" already exists`,
          HttpStatus.CONFLICT,
        );
      }
      throw err;
    }
  }

  async delete(id: string) {
    this.logger.log('Deleting channel', { channelId: id, module: 'prizes' });

    await this.findById(id);

    try {
      return await this.prisma.channel.delete({ where: { id } });
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2003') {
        throw new DomainException(
          ERROR_CODES.CHANNEL_NOT_FOUND,
          'Cannot delete channel: it is referenced by child channels or prize categories',
          HttpStatus.CONFLICT,
        );
      }
      throw err;
    }
  }
}

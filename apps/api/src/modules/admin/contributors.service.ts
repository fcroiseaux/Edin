import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AdminContributorsService {
  private readonly logger = new Logger(AdminContributorsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private decodeCursor(cursor: string): string | null {
    try {
      const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
      const parsed = JSON.parse(decoded) as { id?: string };
      return parsed.id ?? null;
    } catch {
      return null;
    }
  }

  private encodeCursor(id: string): string {
    return Buffer.from(JSON.stringify({ id }), 'utf8').toString('base64url');
  }

  async list(params: {
    search?: string;
    role?: string;
    domain?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
    const where: Prisma.ContributorWhereInput = {};

    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.role) {
      where.role = params.role as Prisma.EnumContributorRoleFilter;
    }

    if (params.domain) {
      where.domain = params.domain as Prisma.EnumContributorDomainNullableFilter;
    }

    const cursorId = params.cursor ? this.decodeCursor(params.cursor) : null;

    const [contributors, total] = await Promise.all([
      this.prisma.contributor.findMany({
        where,
        take: limit + 1,
        ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          domain: true,
          createdAt: true,
          updatedAt: true,
          isActive: true,
        },
      }),
      this.prisma.contributor.count({ where }),
    ]);

    const hasMore = contributors.length > limit;
    const items = hasMore ? contributors.slice(0, limit) : contributors;
    const nextCursor =
      hasMore && items.length > 0 ? this.encodeCursor(items[items.length - 1].id) : null;

    this.logger.debug('Admin contributors list queried', {
      search: params.search,
      role: params.role,
      domain: params.domain,
      resultCount: items.length,
      hasMore,
    });

    return {
      data: items.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        role: c.role,
        domain: c.domain,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        isActive: c.isActive,
      })),
      pagination: { nextCursor, hasMore, limit },
      total,
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Prisma } from '../../../generated/prisma/client/client.js';

export interface AuditLogQueryParams {
  eventType?: string;
  actorId?: string;
  targetId?: string;
  startDate?: string;
  endDate?: string;
  correlationId?: string;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(params: AuditLogQueryParams) {
    const limit = Math.min(params.limit || 50, 200);
    const where: Prisma.AuditLogWhereInput = {};

    if (params.eventType) {
      where.action = params.eventType;
    }
    if (params.actorId) {
      where.actorId = params.actorId;
    }
    if (params.targetId) {
      where.entityId = params.targetId;
    }
    if (params.correlationId) {
      where.correlationId = params.correlationId;
    }
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) {
        where.createdAt.gte = new Date(params.startDate);
      }
      if (params.endDate) {
        const end = new Date(params.endDate);
        // When only a date is provided (no time component), include the entire day
        if (params.endDate.length <= 10) {
          end.setUTCHours(23, 59, 59, 999);
        }
        where.createdAt.lte = end;
      }
    }

    const logs = await this.prisma.auditLog.findMany({
      where,
      take: limit + 1,
      cursor: params.cursor ? { id: params.cursor } : undefined,
      skip: params.cursor ? 1 : 0,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        actorId: true,
        actorRole: true,
        action: true,
        entityType: true,
        entityId: true,
        previousState: true,
        newState: true,
        reason: true,
        details: true,
        correlationId: true,
        createdAt: true,
        actor: { select: { name: true } },
      },
    });

    const hasMore = logs.length > limit;
    const items = hasMore ? logs.slice(0, limit) : logs;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    const data = items.map((log) => ({
      id: log.id,
      actorId: log.actorId,
      actorRole: log.actorRole,
      actorName: log.actor?.name ?? null,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      previousState: log.previousState,
      newState: log.newState,
      reason: log.reason,
      details: log.details,
      correlationId: log.correlationId,
      createdAt: log.createdAt.toISOString(),
    }));

    return {
      data,
      pagination: { cursor: nextCursor, hasMore, total: limit },
    };
  }
}

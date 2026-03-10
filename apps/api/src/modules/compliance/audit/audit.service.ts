import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';

export interface AuditLogParams {
  actorId: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  previousState?: unknown;
  newState?: unknown;
  reason?: string | null;
  details?: unknown;
  correlationId?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an immutable audit log entry.
   * Optionally accepts a Prisma transaction client for transactional audit logging.
   */
  async log(
    params: AuditLogParams,
    tx?: { auditLog: { create: (args: unknown) => Promise<unknown> } },
  ): Promise<void> {
    let actorRole = params.actorRole ?? null;

    if (!actorRole && params.actorId) {
      const actor = await this.prisma.contributor.findUnique({
        where: { id: params.actorId },
        select: { role: true },
      });
      actorRole = actor?.role ?? null;
    }

    const data = {
      actorId: params.actorId,
      actorRole,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      previousState:
        params.previousState !== undefined ? (params.previousState as never) : undefined,
      newState: params.newState !== undefined ? (params.newState as never) : undefined,
      reason: params.reason ?? null,
      details: params.details !== undefined ? (params.details as never) : undefined,
      correlationId: params.correlationId ?? null,
    };

    const client = tx ?? this.prisma;
    await client.auditLog.create({ data });

    this.logger.debug('Audit entry created', {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      actorId: params.actorId,
      correlationId: params.correlationId,
    });
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsService } from './audit-logs.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockAuditLog = (overrides = {}) => ({
  id: 'audit-1',
  actorId: 'actor-1',
  actorRole: 'ADMIN',
  action: 'ROLE_CHANGED',
  entityType: 'contributor',
  entityId: 'target-1',
  previousState: { role: 'CONTRIBUTOR' },
  newState: { role: 'ADMIN' },
  reason: 'Promotion',
  details: null,
  correlationId: 'corr-1',
  createdAt: new Date('2026-03-01T00:00:00Z'),
  actor: { name: 'Admin User' },
  ...overrides,
});

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let prisma: {
    auditLog: { findMany: ReturnType<typeof vi.fn> };
  };

  beforeEach(async () => {
    prisma = {
      auditLog: {
        findMany: vi.fn().mockResolvedValue([mockAuditLog()]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditLogsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
  });

  it('should return paginated audit logs with no filters', async () => {
    const result = await service.list({});

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
        take: 51,
        orderBy: { createdAt: 'desc' },
      }),
    );
    expect(result.data).toHaveLength(1);
    expect(result.data[0].actorName).toBe('Admin User');
    expect(result.pagination.hasMore).toBe(false);
  });

  it('should filter by eventType', async () => {
    await service.list({ eventType: 'ROLE_CHANGED' });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { action: 'ROLE_CHANGED' },
      }),
    );
  });

  it('should filter by actorId', async () => {
    await service.list({ actorId: 'actor-1' });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { actorId: 'actor-1' },
      }),
    );
  });

  it('should filter by targetId', async () => {
    await service.list({ targetId: 'target-1' });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { entityId: 'target-1' },
      }),
    );
  });

  it('should filter by date range', async () => {
    await service.list({
      startDate: '2026-01-01',
      endDate: '2026-03-01',
    });

    const expectedEnd = new Date('2026-03-01');
    expectedEnd.setUTCHours(23, 59, 59, 999);

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          createdAt: {
            gte: new Date('2026-01-01'),
            lte: expectedEnd,
          },
        },
      }),
    );
  });

  it('should filter by correlationId', async () => {
    await service.list({ correlationId: 'corr-123' });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { correlationId: 'corr-123' },
      }),
    );
  });

  it('should handle cursor-based pagination', async () => {
    await service.list({ cursor: 'cursor-id', limit: 10 });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 11,
        cursor: { id: 'cursor-id' },
        skip: 1,
      }),
    );
  });

  it('should detect hasMore when results exceed limit', async () => {
    const logs = Array.from({ length: 11 }, (_, i) => mockAuditLog({ id: `audit-${i}` }));
    prisma.auditLog.findMany.mockResolvedValue(logs);

    const result = await service.list({ limit: 10 });

    expect(result.data).toHaveLength(10);
    expect(result.pagination.hasMore).toBe(true);
    expect(result.pagination.cursor).toBe('audit-9');
  });

  it('should return empty results', async () => {
    prisma.auditLog.findMany.mockResolvedValue([]);

    const result = await service.list({});

    expect(result.data).toHaveLength(0);
    expect(result.pagination.hasMore).toBe(false);
    expect(result.pagination.cursor).toBeNull();
  });

  it('should cap limit at 200', async () => {
    await service.list({ limit: 500 });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 201,
      }),
    );
  });

  it('should combine multiple filters', async () => {
    await service.list({
      eventType: 'ROLE_CHANGED',
      actorId: 'actor-1',
      startDate: '2026-01-01',
    });

    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          action: 'ROLE_CHANGED',
          actorId: 'actor-1',
          createdAt: { gte: new Date('2026-01-01') },
        },
      }),
    );
  });

  it('should map actor name from join', async () => {
    prisma.auditLog.findMany.mockResolvedValue([mockAuditLog({ actor: null })]);

    const result = await service.list({});

    expect(result.data[0].actorName).toBeNull();
  });
});

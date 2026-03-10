import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsController } from './audit-logs.controller.js';
import { AuditLogsService } from './audit-logs.service.js';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Reflector } from '@nestjs/core';

const mockResult = {
  data: [
    {
      id: 'audit-1',
      actorId: 'actor-1',
      actorRole: 'ADMIN',
      actorName: 'Admin User',
      action: 'ROLE_CHANGED',
      entityType: 'contributor',
      entityId: 'target-1',
      previousState: { role: 'CONTRIBUTOR' },
      newState: { role: 'ADMIN' },
      reason: 'Promotion',
      details: null,
      correlationId: 'corr-1',
      createdAt: '2026-03-01T00:00:00.000Z',
    },
  ],
  pagination: { nextCursor: null, hasMore: false, limit: 50 },
};

describe('AuditLogsController', () => {
  let controller: AuditLogsController;
  let auditLogsService: {
    list: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    auditLogsService = {
      list: vi.fn().mockResolvedValue(mockResult),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [
        { provide: AuditLogsService, useValue: auditLogsService },
        { provide: CaslAbilityFactory, useValue: {} },
        { provide: Reflector, useValue: new Reflector() },
      ],
    }).compile();

    controller = module.get<AuditLogsController>(AuditLogsController);
  });

  it('should return audit logs with default params', async () => {
    const req = { correlationId: 'corr-req' } as any;
    const result = await controller.listAuditLogs(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      req,
    );

    expect(auditLogsService.list).toHaveBeenCalledWith({
      eventType: undefined,
      actorId: undefined,
      targetId: undefined,
      startDate: undefined,
      endDate: undefined,
      correlationId: undefined,
      cursor: undefined,
      limit: undefined,
    });
    expect(result).toHaveProperty('data');
  });

  it('should pass all query params to service', async () => {
    const req = { correlationId: 'corr-req' } as any;
    await controller.listAuditLogs(
      'ROLE_CHANGED',
      'actor-1',
      'target-1',
      '2026-01-01',
      '2026-03-01',
      'corr-filter',
      'cursor-1',
      '25',
      req,
    );

    expect(auditLogsService.list).toHaveBeenCalledWith({
      eventType: 'ROLE_CHANGED',
      actorId: 'actor-1',
      targetId: 'target-1',
      startDate: '2026-01-01',
      endDate: '2026-03-01',
      correlationId: 'corr-filter',
      cursor: 'cursor-1',
      limit: 25,
    });
  });

  it('should handle invalid limit gracefully', async () => {
    const req = { correlationId: 'corr-req' } as any;
    await controller.listAuditLogs(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'not-a-number',
      req,
    );

    expect(auditLogsService.list).toHaveBeenCalledWith(
      expect.objectContaining({ limit: undefined }),
    );
  });

  it('should use JwtAuthGuard and AbilityGuard decorators', () => {
    const guards = Reflect.getMetadata('__guards__', AuditLogsController);
    expect(guards).toBeDefined();
    expect(guards.length).toBeGreaterThanOrEqual(2);
  });

  it('should return response in envelope format', async () => {
    const req = { correlationId: 'test-corr' } as any;
    const result = await controller.listAuditLogs(
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      req,
    );

    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('meta');
  });
});

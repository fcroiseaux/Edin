import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: {
    auditLog: { create: ReturnType<typeof vi.fn> };
    contributor: { findUnique: ReturnType<typeof vi.fn> };
  };

  beforeEach(async () => {
    prisma = {
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      contributor: {
        findUnique: vi.fn().mockResolvedValue({ role: 'ADMIN' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should create an audit log entry with all fields', async () => {
    await service.log({
      actorId: 'actor-1',
      actorRole: 'ADMIN',
      action: 'ROLE_CHANGED',
      entityType: 'contributor',
      entityId: 'target-1',
      previousState: { role: 'CONTRIBUTOR' },
      newState: { role: 'ADMIN' },
      reason: 'Promotion',
      details: { extra: 'context' },
      correlationId: 'corr-1',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'actor-1',
        actorRole: 'ADMIN',
        action: 'ROLE_CHANGED',
        entityType: 'contributor',
        entityId: 'target-1',
        previousState: { role: 'CONTRIBUTOR' },
        newState: { role: 'ADMIN' },
        reason: 'Promotion',
        details: { extra: 'context' },
        correlationId: 'corr-1',
      }),
    });
  });

  it('should resolve actorRole from DB when not provided', async () => {
    prisma.contributor.findUnique.mockResolvedValue({ role: 'CONTRIBUTOR' });

    await service.log({
      actorId: 'actor-1',
      action: 'PROFILE_UPDATED',
      entityType: 'contributor',
      entityId: 'actor-1',
    });

    expect(prisma.contributor.findUnique).toHaveBeenCalledWith({
      where: { id: 'actor-1' },
      select: { role: true },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorRole: 'CONTRIBUTOR',
      }),
    });
  });

  it('should handle null actorId for system events', async () => {
    await service.log({
      actorId: null,
      action: 'admission.buddy.assignment.skipped',
      entityType: 'Application',
      entityId: 'app-1',
      reason: 'no_eligible_buddies',
    });

    expect(prisma.contributor.findUnique).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: null,
        actorRole: null,
        action: 'admission.buddy.assignment.skipped',
      }),
    });
  });

  it('should handle null actorRole when actor not found in DB', async () => {
    prisma.contributor.findUnique.mockResolvedValue(null);

    await service.log({
      actorId: 'deleted-actor',
      action: 'SETTING_UPDATED',
      entityType: 'PlatformSetting',
      entityId: 'key-1',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorRole: null,
      }),
    });
  });

  it('should set defaults for optional fields', async () => {
    await service.log({
      actorId: 'actor-1',
      actorRole: 'ADMIN',
      action: 'test.action',
      entityType: 'TestEntity',
      entityId: 'entity-1',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        reason: null,
        correlationId: null,
      }),
    });
  });

  it('should use transaction client when provided', async () => {
    const txClient = {
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-tx-1' }),
      },
    };

    await service.log(
      {
        actorId: 'actor-1',
        actorRole: 'ADMIN',
        action: 'SETTING_UPDATED',
        entityType: 'PlatformSetting',
        entityId: 'setting-key',
        correlationId: 'corr-tx',
      },
      txClient,
    );

    expect(txClient.auditLog.create).toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('should include previousState and newState when provided', async () => {
    await service.log({
      actorId: 'actor-1',
      actorRole: 'ADMIN',
      action: 'ROLE_CHANGED',
      entityType: 'contributor',
      entityId: 'target-1',
      previousState: { role: 'CONTRIBUTOR' },
      newState: { role: 'WORKING_GROUP_LEAD' },
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        previousState: { role: 'CONTRIBUTOR' },
        newState: { role: 'WORKING_GROUP_LEAD' },
      }),
    });
  });

  it('should preserve correlationId from params', async () => {
    await service.log({
      actorId: 'actor-1',
      actorRole: 'ADMIN',
      action: 'test',
      entityType: 'Test',
      entityId: 'test-1',
      correlationId: 'specific-correlation-id',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        correlationId: 'specific-correlation-id',
      }),
    });
  });
});

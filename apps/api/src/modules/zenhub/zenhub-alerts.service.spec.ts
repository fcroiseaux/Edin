import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ZenhubAlertsService, ConflictResolutionError } from './zenhub-alerts.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { SettingsService } from '../settings/settings.service.js';

const mockPrisma = {
  zenhubSync: {
    count: vi.fn(),
    findFirst: vi.fn(),
  },
  zenhubSyncConflict: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  task: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
};

const mockSettings = {
  getSettingValue: vi.fn(),
  updateSetting: vi.fn(),
};

const mockEventEmitter = {
  emit: vi.fn(),
};

describe('ZenhubAlertsService', () => {
  let service: ZenhubAlertsService;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Default: return reasonable defaults for any getSettingValue call
    mockSettings.getSettingValue.mockImplementation((_key: string, defaultValue: unknown) =>
      Promise.resolve(defaultValue),
    );

    const module = await Test.createTestingModule({
      providers: [
        ZenhubAlertsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: SettingsService, useValue: mockSettings },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get(ZenhubAlertsService);
  });

  describe('getAlertConfig', () => {
    it('returns default config from settings', async () => {
      const config = await service.getAlertConfig();

      expect(config).toEqual({
        webhookFailureThreshold: 1,
        pollingTimeoutMinutes: 60,
        enabled: true,
      });
    });
  });

  describe('updateAlertConfig', () => {
    it('persists via SettingsService', async () => {
      // After updateSetting calls, getAlertConfig reads back — mock to return updated values
      mockSettings.getSettingValue.mockImplementation((key: string) => {
        if (key === 'zenhub.alert.webhook_failure_threshold') return Promise.resolve(5);
        if (key === 'zenhub.alert.polling_timeout_minutes') return Promise.resolve(120);
        if (key === 'zenhub.alert.enabled') return Promise.resolve(true);
        return Promise.resolve(null);
      });

      const config = await service.updateAlertConfig(
        { webhookFailureThreshold: 5, pollingTimeoutMinutes: 120 },
        'admin-1',
        'corr-1',
      );

      expect(mockSettings.updateSetting).toHaveBeenCalledWith(
        'zenhub.alert.webhook_failure_threshold',
        5,
        'admin-1',
        'corr-1',
      );
      expect(mockSettings.updateSetting).toHaveBeenCalledWith(
        'zenhub.alert.polling_timeout_minutes',
        120,
        'admin-1',
        'corr-1',
      );
      expect(config.webhookFailureThreshold).toBe(5);
      expect(config.pollingTimeoutMinutes).toBe(120);
    });
  });

  describe('getActiveAlerts', () => {
    it('returns webhook failure rate alert when threshold exceeded', async () => {
      mockPrisma.zenhubSync.count
        .mockResolvedValueOnce(100) // webhookTotal
        .mockResolvedValueOnce(10); // webhookFailed (10% failure)
      mockPrisma.zenhubSync.findFirst.mockResolvedValue({
        receivedAt: new Date(), // recent poll
      });
      mockRedis.get.mockResolvedValue(null); // not dismissed

      const alerts = await service.getActiveAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('ZENHUB_WEBHOOK_FAILURE_RATE');
      expect(alerts[0].currentValue).toBe(10);
      expect(alerts[0].dismissed).toBe(false);
    });

    it('returns polling timeout alert when poll stale', async () => {
      mockPrisma.zenhubSync.count.mockResolvedValueOnce(100).mockResolvedValueOnce(0); // 0 failures
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      mockPrisma.zenhubSync.findFirst.mockResolvedValue({
        receivedAt: twoHoursAgo,
      });
      mockRedis.get.mockResolvedValue(null);

      const alerts = await service.getActiveAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('ZENHUB_POLLING_TIMEOUT');
      expect(alerts[0].currentValue).toBeGreaterThan(60);
    });

    it('returns empty when below thresholds', async () => {
      mockPrisma.zenhubSync.count.mockResolvedValueOnce(100).mockResolvedValueOnce(0); // 0% failure
      mockPrisma.zenhubSync.findFirst.mockResolvedValue({
        receivedAt: new Date(), // just now
      });

      const alerts = await service.getActiveAlerts();

      expect(alerts).toHaveLength(0);
    });

    it('marks dismissed alerts', async () => {
      mockPrisma.zenhubSync.count.mockResolvedValueOnce(100).mockResolvedValueOnce(10); // 10% failure
      mockPrisma.zenhubSync.findFirst.mockResolvedValue({
        receivedAt: new Date(),
      });
      mockRedis.get.mockResolvedValue({ dismissed: true });

      const alerts = await service.getActiveAlerts();

      expect(alerts[0].dismissed).toBe(true);
    });

    it('returns empty when disabled', async () => {
      mockSettings.getSettingValue.mockImplementation((key: string, defaultValue: unknown) => {
        if (key === 'zenhub.alert.enabled') return Promise.resolve(false);
        return Promise.resolve(defaultValue);
      });

      const alerts = await service.getActiveAlerts();

      expect(alerts).toHaveLength(0);
    });
  });

  describe('dismissAlert', () => {
    it('stores dismissal in Redis', async () => {
      await service.dismissAlert('alert-123');

      expect(mockRedis.set).toHaveBeenCalledWith(
        'admin:alert:dismissed:alert-123',
        { dismissed: true },
        86400,
      );
    });
  });

  describe('getSyncConflicts', () => {
    it('returns paginated conflicts', async () => {
      const records = [
        {
          id: 'conflict-1',
          syncId: 'sync-1',
          conflictType: 'status_mismatch',
          affectedEntity: 'issue',
          affectedEntityId: 'issue-42',
          resolution: 'auto-resolved',
          outcome: 'Zenhub value applied',
          occurredAt: new Date('2026-03-15T10:00:00Z'),
          resolvedBy: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrisma.zenhubSyncConflict.findMany.mockResolvedValue(records);

      const result = await service.getSyncConflicts({ limit: 25 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].conflictType).toBe('status_mismatch');
      expect(result.data[0].resolution).toBe('auto-resolved');
      expect(result.pagination.hasMore).toBe(false);
    });

    it('filters by resolution', async () => {
      mockPrisma.zenhubSyncConflict.findMany.mockResolvedValue([]);

      await service.getSyncConflicts({ limit: 25, resolution: 'pending' });

      expect(mockPrisma.zenhubSyncConflict.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ resolution: 'pending' }),
        }),
      );
    });
  });

  describe('resolveConflict (zh-5-3)', () => {
    const pendingConflict = {
      id: 'conflict-1',
      syncId: null,
      conflictType: 'SPRINT_SYNC_CONFLICT',
      affectedEntity: 'Task',
      affectedEntityId: 'task-1',
      resolution: 'pending',
      outcome: JSON.stringify({
        edinStatus: 'AVAILABLE',
        zenhubPipeline: 'QA Testing',
        zenhubMappedStatus: null,
        appliedStatus: null,
        taskId: 'task-1',
        zenhubIssueId: 'zh-issue-1',
      }),
      occurredAt: new Date('2026-03-15T10:00:00Z'),
      resolvedBy: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('resolves with keep-edin without changing task', async () => {
      mockPrisma.zenhubSyncConflict.findUnique.mockResolvedValue(pendingConflict);
      mockPrisma.zenhubSyncConflict.update.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async ({ data }: { data: Record<string, unknown> }) => ({ ...pendingConflict, ...data }),
      );

      const result = await service.resolveConflict(
        'conflict-1',
        { action: 'keep-edin' },
        'admin-1',
        'corr-r1',
      );

      expect(result.resolution).toBe('manual-resolved');
      expect(result.resolvedBy).toBe('admin-1');
      expect(mockPrisma.task.update).not.toHaveBeenCalled();
    });

    it('resolves with apply-status and updates task', async () => {
      mockPrisma.zenhubSyncConflict.findUnique.mockResolvedValue(pendingConflict);
      mockPrisma.task.findUnique.mockResolvedValue({ id: 'task-1', status: 'AVAILABLE' });
      mockPrisma.task.update.mockResolvedValue({});
      mockPrisma.zenhubSyncConflict.update.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async ({ data }: { data: Record<string, unknown> }) => ({ ...pendingConflict, ...data }),
      );

      const result = await service.resolveConflict(
        'conflict-1',
        { action: 'apply-status', applyStatus: 'IN_PROGRESS' },
        'admin-1',
        'corr-r2',
      );

      expect(result.resolution).toBe('manual-resolved');
      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { status: 'IN_PROGRESS' },
      });
    });

    it('sets completedAt when applying COMPLETED status', async () => {
      mockPrisma.zenhubSyncConflict.findUnique.mockResolvedValue(pendingConflict);
      mockPrisma.task.findUnique.mockResolvedValue({ id: 'task-1', status: 'AVAILABLE' });
      mockPrisma.task.update.mockResolvedValue({});
      mockPrisma.zenhubSyncConflict.update.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async ({ data }: { data: Record<string, unknown> }) => ({ ...pendingConflict, ...data }),
      );

      await service.resolveConflict(
        'conflict-1',
        { action: 'apply-status', applyStatus: 'COMPLETED' },
        'admin-1',
        'corr-r3',
      );

      expect(mockPrisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: { status: 'COMPLETED', completedAt: expect.any(Date) },
      });
    });

    it('sets resolvedBy to adminId', async () => {
      mockPrisma.zenhubSyncConflict.findUnique.mockResolvedValue(pendingConflict);
      mockPrisma.zenhubSyncConflict.update.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async ({ data }: { data: Record<string, unknown> }) => ({ ...pendingConflict, ...data }),
      );

      await service.resolveConflict('conflict-1', { action: 'keep-edin' }, 'admin-xyz', 'corr-r4');

      expect(mockPrisma.zenhubSyncConflict.update).toHaveBeenCalledWith({
        where: { id: 'conflict-1' },
        data: expect.objectContaining({
          resolution: 'manual-resolved',
          resolvedBy: 'admin-xyz',
        }),
      });
    });

    it('emits sprint.sync.conflict.resolved event', async () => {
      mockPrisma.zenhubSyncConflict.findUnique.mockResolvedValue(pendingConflict);
      mockPrisma.zenhubSyncConflict.update.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async ({ data }: { data: Record<string, unknown> }) => ({ ...pendingConflict, ...data }),
      );

      await service.resolveConflict('conflict-1', { action: 'keep-edin' }, 'admin-1', 'corr-r5');

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'sprint.sync.conflict.resolved',
        expect.objectContaining({
          eventType: 'sprint.sync.conflict.resolved',
          payload: expect.objectContaining({
            conflictId: 'conflict-1',
            resolution: 'manual-resolved',
            action: 'keep-edin',
            adminId: 'admin-1',
          }),
        }),
      );
    });

    it('emits task.status-changed event when task status is changed', async () => {
      mockPrisma.zenhubSyncConflict.findUnique.mockResolvedValue(pendingConflict);
      mockPrisma.task.findUnique.mockResolvedValue({ id: 'task-1', status: 'AVAILABLE' });
      mockPrisma.task.update.mockResolvedValue({});
      mockPrisma.zenhubSyncConflict.update.mockImplementation(
        // eslint-disable-next-line @typescript-eslint/require-await
        async ({ data }: { data: Record<string, unknown> }) => ({ ...pendingConflict, ...data }),
      );

      await service.resolveConflict(
        'conflict-1',
        { action: 'apply-status', applyStatus: 'IN_PROGRESS' },
        'admin-1',
        'corr-r6',
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'task.status-changed',
        expect.objectContaining({
          eventType: 'task.status-changed',
          actorId: 'admin-1',
          payload: expect.objectContaining({
            taskId: 'task-1',
            previousStatus: 'AVAILABLE',
            newStatus: 'IN_PROGRESS',
          }),
        }),
      );
    });

    it('throws ConflictResolutionError for non-existent conflict', async () => {
      mockPrisma.zenhubSyncConflict.findUnique.mockResolvedValue(null);

      await expect(
        service.resolveConflict('nonexistent', { action: 'keep-edin' }, 'admin-1'),
      ).rejects.toThrow(ConflictResolutionError);

      try {
        await service.resolveConflict('nonexistent', { action: 'keep-edin' }, 'admin-1');
      } catch (e) {
        expect((e as ConflictResolutionError).code).toBe('ZENHUB_SYNC_CONFLICT_NOT_FOUND');
      }
    });

    it('throws ConflictResolutionError for already-resolved conflict', async () => {
      mockPrisma.zenhubSyncConflict.findUnique.mockResolvedValue({
        ...pendingConflict,
        resolution: 'auto-resolved',
      });

      await expect(
        service.resolveConflict('conflict-1', { action: 'keep-edin' }, 'admin-1'),
      ).rejects.toThrow(ConflictResolutionError);

      try {
        await service.resolveConflict('conflict-1', { action: 'keep-edin' }, 'admin-1');
      } catch (e) {
        expect((e as ConflictResolutionError).code).toBe('ZENHUB_SYNC_CONFLICT_ALREADY_RESOLVED');
      }
    });
  });
});

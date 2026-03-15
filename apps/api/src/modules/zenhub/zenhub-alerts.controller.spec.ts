import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ZenhubAlertsController } from './zenhub-alerts.controller.js';
import { ZenhubAlertsService } from './zenhub-alerts.service.js';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';
import type { ZenhubAlertConfig, SystemAlert } from '@edin/shared';

const mockConfig: ZenhubAlertConfig = {
  webhookFailureThreshold: 1,
  pollingTimeoutMinutes: 60,
  enabled: true,
};

const mockAlert: SystemAlert = {
  id: 'abc123',
  type: 'ZENHUB_WEBHOOK_FAILURE_RATE',
  severity: 'WARNING',
  threshold: 1,
  currentValue: 5.5,
  message: 'Zenhub webhook failure rate is 5.5%',
  occurredAt: '2026-03-15T10:00:00.000Z',
  dismissed: false,
};

const mockResolvedConflict = {
  id: 'conflict-1',
  syncId: null,
  conflictType: 'SPRINT_SYNC_CONFLICT',
  affectedEntity: 'Task',
  affectedEntityId: 'task-1',
  resolution: 'manual-resolved',
  outcome: '{}',
  occurredAt: '2026-03-15T10:00:00.000Z',
  resolvedBy: 'admin-1',
};

const mockService = {
  getAlertConfig: vi.fn().mockResolvedValue(mockConfig),
  updateAlertConfig: vi.fn().mockResolvedValue(mockConfig),
  getActiveAlerts: vi.fn().mockResolvedValue([mockAlert]),
  dismissAlert: vi.fn().mockResolvedValue(true),
  getSyncConflicts: vi.fn().mockResolvedValue({
    data: [],
    pagination: { cursor: null, hasMore: false },
  }),
  resolveConflict: vi.fn().mockResolvedValue(mockResolvedConflict),
};

describe('ZenhubAlertsController', () => {
  let controller: ZenhubAlertsController;

  const mockRequest = { correlationId: 'test-corr' } as never;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [ZenhubAlertsController],
      providers: [
        { provide: ZenhubAlertsService, useValue: mockService },
        { provide: CaslAbilityFactory, useValue: {} },
      ],
    }).compile();

    controller = module.get(ZenhubAlertsController);
  });

  describe('GET /', () => {
    it('returns active alerts', async () => {
      const result = await controller.getActiveAlerts(mockRequest);

      expect(result.data).toEqual([mockAlert]);
      expect(result.meta.correlationId).toBe('test-corr');
    });
  });

  describe('GET /config', () => {
    it('returns alert config', async () => {
      const result = await controller.getAlertConfig(mockRequest);

      expect(result.data).toEqual(mockConfig);
    });
  });

  describe('PATCH /config', () => {
    it('validates and updates config', async () => {
      const body = { webhookFailureThreshold: 5 };
      const result = await controller.updateAlertConfig(body, 'admin-1', mockRequest);

      expect(result.data).toEqual(mockConfig);
      expect(mockService.updateAlertConfig).toHaveBeenCalledWith(
        { webhookFailureThreshold: 5 },
        'admin-1',
        'test-corr',
      );
    });

    it('rejects invalid threshold', async () => {
      const body = { webhookFailureThreshold: 200 }; // >100

      await expect(
        controller.updateAlertConfig(body, 'admin-1', mockRequest),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });
  });

  describe('POST /dismiss/:alertId', () => {
    it('dismisses alert', async () => {
      const result = await controller.dismissAlert('abc123', mockRequest);

      expect(result.data).toEqual({ dismissed: true });
      expect(mockService.dismissAlert).toHaveBeenCalledWith('abc123');
    });
  });

  describe('GET /conflicts', () => {
    it('returns paginated conflicts', async () => {
      const result = await controller.getSyncConflicts({}, mockRequest);

      expect(result.data).toEqual([]);
      expect(result.meta.pagination).toEqual({ cursor: null, hasMore: false });
    });
  });

  describe('PATCH /conflicts/:id/resolve', () => {
    it('validates input and calls resolveConflict', async () => {
      const body = { action: 'keep-edin' };
      const result = await controller.resolveConflict('conflict-1', body, 'admin-1', mockRequest);

      expect(result.data).toEqual(mockResolvedConflict);
      expect(mockService.resolveConflict).toHaveBeenCalledWith(
        'conflict-1',
        { action: 'keep-edin' },
        'admin-1',
        'test-corr',
      );
    });

    it('rejects invalid action', async () => {
      const body = { action: 'invalid-action' };

      await expect(
        controller.resolveConflict('conflict-1', body, 'admin-1', mockRequest),
      ).rejects.toMatchObject({ status: HttpStatus.BAD_REQUEST });
    });
  });
});

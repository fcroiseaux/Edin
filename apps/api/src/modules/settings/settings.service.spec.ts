import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SettingsService } from './settings.service.js';
import { AuditService } from '../compliance/audit/audit.service.js';

const mockAuditService = { log: vi.fn().mockResolvedValue(undefined) };

const mockPrisma = {
  platformSetting: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
  $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      platformSetting: {
        upsert: mockPrisma.platformSetting.upsert,
      },
    }),
  ),
};

describe('SettingsService', () => {
  let service: SettingsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SettingsService(mockPrisma as never, mockAuditService as unknown as AuditService);
  });

  describe('getSetting', () => {
    it('returns setting value when exists', async () => {
      mockPrisma.platformSetting.findUnique.mockResolvedValue({
        key: 'feedback.sla.hours',
        value: 48,
        updatedAt: new Date('2026-03-09'),
      });

      const result = await service.getSetting('feedback.sla.hours');
      expect(result).toEqual({
        key: 'feedback.sla.hours',
        value: 48,
        updatedAt: new Date('2026-03-09'),
      });
    });

    it('returns null when not found', async () => {
      mockPrisma.platformSetting.findUnique.mockResolvedValue(null);

      const result = await service.getSetting('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getSettingValue', () => {
    it('returns typed value when key exists', async () => {
      mockPrisma.platformSetting.findUnique.mockResolvedValue({
        key: 'feedback.sla.hours',
        value: 72,
      });

      const result = await service.getSettingValue<number>('feedback.sla.hours', 48);
      expect(result).toBe(72);
    });

    it('returns default when key not found', async () => {
      mockPrisma.platformSetting.findUnique.mockResolvedValue(null);

      const result = await service.getSettingValue<number>('nonexistent', 48);
      expect(result).toBe(48);
    });
  });

  describe('updateSetting', () => {
    it('upserts value and creates audit log', async () => {
      mockPrisma.platformSetting.findUnique.mockResolvedValue({
        key: 'feedback.sla.hours',
        value: 48,
      });
      mockPrisma.platformSetting.upsert.mockResolvedValue({
        key: 'feedback.sla.hours',
        value: 72,
        updatedBy: 'admin-1',
        updatedAt: new Date(),
        createdAt: new Date(),
      });
      const result = await service.updateSetting('feedback.sla.hours', 72, 'admin-1', 'corr-1');
      expect(result.value).toBe(72);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SETTING_UPDATED',
          entityType: 'PlatformSetting',
          entityId: 'feedback.sla.hours',
          details: { key: 'feedback.sla.hours', oldValue: 48, newValue: 72 },
        }),
        expect.anything(),
      );
    });

    it('stores oldValue in audit details', async () => {
      mockPrisma.platformSetting.findUnique.mockResolvedValue({
        key: 'feedback.sla.hours',
        value: 48,
      });
      mockPrisma.platformSetting.upsert.mockResolvedValue({
        key: 'feedback.sla.hours',
        value: 24,
        updatedBy: 'admin-1',
        updatedAt: new Date(),
        createdAt: new Date(),
      });
      await service.updateSetting('feedback.sla.hours', 24, 'admin-1');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          details: expect.objectContaining({ oldValue: 48 }),
        }),
        expect.anything(),
      );
    });
  });
});

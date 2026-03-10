import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SettingsAdminService } from './settings-admin.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSettingsService = {
  getSetting: vi.fn(),
  updateSetting: vi.fn(),
};

const mockEventEmitter = {
  emit: vi.fn(),
};

describe('SettingsAdminService', () => {
  let service: SettingsAdminService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        SettingsAdminService,
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get(SettingsAdminService);
  });

  describe('getAllSections', () => {
    it('returns all sections with defaults when no settings exist', async () => {
      mockSettingsService.getSetting.mockResolvedValue(null);

      const result = await service.getAllSections();

      expect(result).toHaveLength(3);
      expect(result.map((s) => s.section)).toEqual(['github', 'feedback', 'onboarding']);
      expect(result[0].label).toBe('GitHub Repositories');
      expect(result[1].settings['feedback.sla_threshold_hours']).toBe(48);
    });
  });

  describe('getSection', () => {
    it('returns section with stored values overriding defaults', async () => {
      mockSettingsService.getSetting.mockImplementation((key: string) => {
        if (key === 'feedback.sla_threshold_hours') {
          return { key, value: 24, updatedAt: new Date('2026-03-01') };
        }
        return null;
      });

      const result = await service.getSection('feedback');

      expect(result.section).toBe('feedback');
      expect(result.settings['feedback.sla_threshold_hours']).toBe(24);
      expect(result.settings['feedback.max_concurrent_assignments']).toBe(3); // default
      expect(result.updatedAt).toBeTruthy();
    });

    it('throws for invalid section', async () => {
      await expect(service.getSection('invalid')).rejects.toThrow(DomainException);
    });
  });

  describe('updateSection', () => {
    it('updates valid settings and emits event', async () => {
      mockSettingsService.updateSetting.mockResolvedValue({});
      mockSettingsService.getSetting.mockResolvedValue(null);

      const result = await service.updateSection(
        'feedback',
        { 'feedback.sla_threshold_hours': 24 },
        'admin-uuid',
        'corr-id',
      );

      expect(mockSettingsService.updateSetting).toHaveBeenCalledWith(
        'feedback.sla_threshold_hours',
        24,
        'admin-uuid',
        'corr-id',
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'platform.settings.updated',
        expect.objectContaining({
          eventType: 'platform.settings.updated',
          actorId: 'admin-uuid',
          payload: {
            section: 'feedback',
            updatedKeys: ['feedback.sla_threshold_hours'],
          },
        }),
      );
      expect(result.section).toBe('feedback');
    });

    it('ignores unknown keys and only updates valid ones', async () => {
      mockSettingsService.updateSetting.mockResolvedValue({});
      mockSettingsService.getSetting.mockResolvedValue(null);

      await service.updateSection(
        'feedback',
        {
          'feedback.sla_threshold_hours': 24,
          'feedback.unknown_key': 'value',
        },
        'admin-uuid',
      );

      expect(mockSettingsService.updateSetting).toHaveBeenCalledTimes(1);
      expect(mockSettingsService.updateSetting).toHaveBeenCalledWith(
        'feedback.sla_threshold_hours',
        24,
        'admin-uuid',
        undefined,
      );
    });

    it('throws for invalid section', async () => {
      await expect(service.updateSection('invalid', {}, 'admin-uuid')).rejects.toThrow(
        DomainException,
      );
    });
  });
});

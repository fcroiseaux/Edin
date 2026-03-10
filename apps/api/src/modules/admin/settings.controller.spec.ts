import { Test } from '@nestjs/testing';
import { AdminSettingsController } from './settings.controller.js';
import { SettingsAdminService } from './settings-admin.service.js';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';
import { Reflector } from '@nestjs/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSettingsAdminService = {
  getAllSections: vi.fn(),
  getSection: vi.fn(),
  updateSection: vi.fn(),
};

describe('AdminSettingsController', () => {
  let controller: AdminSettingsController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [AdminSettingsController],
      providers: [
        { provide: SettingsAdminService, useValue: mockSettingsAdminService },
        { provide: CaslAbilityFactory, useValue: {} },
        { provide: Reflector, useValue: new Reflector() },
      ],
    }).compile();

    controller = module.get(AdminSettingsController);
  });

  describe('getAllSettings', () => {
    it('returns all sections', async () => {
      const sections = [
        { section: 'github', label: 'GitHub Repositories', settings: {}, updatedAt: null },
        { section: 'feedback', label: 'Feedback Assignment Rules', settings: {}, updatedAt: null },
      ];
      mockSettingsAdminService.getAllSections.mockResolvedValueOnce(sections);

      const result = await controller.getAllSettings({ correlationId: 'corr' } as any);

      expect(result.data.sections).toHaveLength(2);
      expect(result.meta.correlationId).toBe('corr');
    });
  });

  describe('getSection', () => {
    it('returns specific section', async () => {
      const section = {
        section: 'feedback',
        label: 'Feedback Assignment Rules',
        settings: { 'feedback.sla_threshold_hours': 48 },
        updatedAt: null,
      };
      mockSettingsAdminService.getSection.mockResolvedValueOnce(section);

      const result = await controller.getSection('feedback', { correlationId: 'corr' } as any);

      expect(result.data.section).toBe('feedback');
      expect(mockSettingsAdminService.getSection).toHaveBeenCalledWith('feedback');
    });
  });

  describe('updateSection', () => {
    it('updates section and returns updated data', async () => {
      const updated = {
        section: 'feedback',
        label: 'Feedback Assignment Rules',
        settings: { 'feedback.sla_threshold_hours': 24 },
        updatedAt: '2026-03-10T00:00:00.000Z',
      };
      mockSettingsAdminService.updateSection.mockResolvedValueOnce(updated);

      const result = await controller.updateSection(
        'feedback',
        { 'feedback.sla_threshold_hours': 24 },
        'admin-uuid',
        { correlationId: 'corr' } as any,
      );

      expect(result.data.settings['feedback.sla_threshold_hours']).toBe(24);
      expect(mockSettingsAdminService.updateSection).toHaveBeenCalledWith(
        'feedback',
        { 'feedback.sla_threshold_hours': 24 },
        'admin-uuid',
        'corr',
      );
    });

    it('propagates errors from service', async () => {
      mockSettingsAdminService.updateSection.mockRejectedValueOnce(new Error('Section not found'));

      await expect(
        controller.updateSection('invalid', {}, 'admin-uuid', { correlationId: 'corr' } as any),
      ).rejects.toThrow();
    });
  });
});

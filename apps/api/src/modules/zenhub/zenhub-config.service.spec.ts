import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ZenhubConfigService } from './zenhub-config.service.js';
import { SettingsService } from '../settings/settings.service.js';

const mockSettingsService = {
  getSetting: vi.fn(),
  getSettingValue: vi.fn().mockResolvedValue(null),
  updateSetting: vi.fn().mockResolvedValue({}),
};

const mockConfigService = {
  get: vi.fn().mockReturnValue(undefined),
};

const mockEventEmitter = {
  emit: vi.fn(),
};

describe('ZenhubConfigService', () => {
  let service: ZenhubConfigService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        ZenhubConfigService,
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get(ZenhubConfigService);
  });

  describe('getConfig', () => {
    it('returns unconfigured state when nothing is set', async () => {
      const config = await service.getConfig();

      expect(config).toEqual({
        apiTokenConfigured: false,
        apiTokenHint: null,
        webhookUrl: null,
        webhookSecretConfigured: false,
        pollingIntervalMs: 900_000,
        workspaceMapping: null,
        taskSyncEnabled: false,
        contributorTaskLabel: null,
        taskSyncCreatorId: null,
        statusSyncEnabled: false,
        pipelineStatusMapping: {
          Backlog: 'AVAILABLE',
          'Sprint Backlog': 'AVAILABLE',
          'In Progress': 'IN_PROGRESS',
          'In Review': 'IN_PROGRESS',
          Done: 'COMPLETED',
        },
        planningContextEnabled: false,
        combinedScoreEnabled: false,
        qualityWeight: 0.8,
        planningWeight: 0.2,
      });
    });

    it('returns configured state from DB settings', async () => {
      mockSettingsService.getSettingValue
        .mockResolvedValueOnce('zh_token_abc123') // apiToken
        .mockResolvedValueOnce('https://example.com/webhooks/zenhub') // webhookUrl
        .mockResolvedValueOnce('secret123456789012') // webhookSecret
        .mockResolvedValueOnce(600_000) // pollingIntervalMs
        .mockResolvedValueOnce({ ws1: 'Technology' }); // workspaceMapping

      const config = await service.getConfig();

      expect(config.apiTokenConfigured).toBe(true);
      expect(config.apiTokenHint).toBe('****c123');
      expect(config.webhookUrl).toBe('https://example.com/webhooks/zenhub');
      expect(config.webhookSecretConfigured).toBe(true);
      expect(config.pollingIntervalMs).toBe(600_000);
      expect(config.workspaceMapping).toEqual({ ws1: 'Technology' });
    });

    it('falls back to env vars when DB settings are null', async () => {
      // DB returns null for all, so falls through to ConfigService
      mockConfigService.get
        .mockReturnValueOnce('env_token_xyz') // ZENHUB_API_TOKEN
        .mockReturnValueOnce('env_secret') // ZENHUB_WEBHOOK_SECRET
        .mockReturnValueOnce(300_000) // ZENHUB_POLLING_INTERVAL_MS
        .mockReturnValueOnce('env_workspace'); // ZENHUB_WORKSPACE_ID

      const config = await service.getConfig();

      expect(config.apiTokenConfigured).toBe(true);
      expect(config.apiTokenHint).toBe('****_xyz');
      expect(config.webhookSecretConfigured).toBe(true);
    });

    it('masks token showing only last 4 chars', async () => {
      mockSettingsService.getSettingValue.mockResolvedValueOnce('abcdefghijklmnop');

      const config = await service.getConfig();

      expect(config.apiTokenHint).toBe('****mnop');
    });

    it('masks short tokens completely', async () => {
      mockSettingsService.getSettingValue.mockResolvedValueOnce('abc');

      const config = await service.getConfig();

      expect(config.apiTokenHint).toBe('****');
    });
  });

  describe('updateConfig', () => {
    it('updates specified fields and emits event', async () => {
      const updates = {
        apiToken: 'new_token',
        pollingIntervalMs: 600_000,
      };

      await service.updateConfig(updates, 'admin-id', 'corr-123');

      expect(mockSettingsService.updateSetting).toHaveBeenCalledWith(
        'zenhub.api_token',
        'new_token',
        'admin-id',
        'corr-123',
        { redactAudit: true },
      );
      expect(mockSettingsService.updateSetting).toHaveBeenCalledWith(
        'zenhub.polling_interval_ms',
        600_000,
        'admin-id',
        'corr-123',
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'zenhub.config.updated',
        expect.objectContaining({
          eventType: 'zenhub.config.updated',
          actorId: 'admin-id',
          payload: { updatedKeys: ['apiToken', 'pollingIntervalMs'] },
        }),
      );
    });

    it('does not emit event when no updates provided', async () => {
      await service.updateConfig({}, 'admin-id');

      expect(mockSettingsService.updateSetting).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('updates webhook secret with audit redaction', async () => {
      await service.updateConfig({ webhookSecret: 'new_secret_value_16' }, 'admin-id');

      expect(mockSettingsService.updateSetting).toHaveBeenCalledWith(
        'zenhub.webhook_secret',
        'new_secret_value_16',
        'admin-id',
        undefined,
        { redactAudit: true },
      );
    });

    it('updates workspace mapping', async () => {
      const mapping = { ws1: 'Technology', ws2: 'Finance' };
      await service.updateConfig({ workspaceMapping: mapping }, 'admin-id');

      expect(mockSettingsService.updateSetting).toHaveBeenCalledWith(
        'zenhub.workspace_mapping',
        mapping,
        'admin-id',
        undefined,
      );
    });

    it('returns updated config after saving', async () => {
      const result = await service.updateConfig({ webhookUrl: 'https://test.com/wh' }, 'admin-id');

      expect(result).toBeDefined();
      expect(result.apiTokenConfigured).toBe(false);
    });
  });

  describe('resolvePlanningContextEnabled', () => {
    it('returns false by default when no DB value set', async () => {
      const result = await service.resolvePlanningContextEnabled();
      expect(result).toBe(false);
    });

    it('returns true when DB value is true', async () => {
      mockSettingsService.getSettingValue.mockResolvedValueOnce(true);
      const result = await service.resolvePlanningContextEnabled();
      expect(result).toBe(true);
    });

    it('returns false when DB value is null', async () => {
      mockSettingsService.getSettingValue.mockResolvedValueOnce(null);
      const result = await service.resolvePlanningContextEnabled();
      expect(result).toBe(false);
    });
  });

  describe('resolveCombinedScoreEnabled', () => {
    it('returns false by default when no DB value set', async () => {
      const result = await service.resolveCombinedScoreEnabled();
      expect(result).toBe(false);
    });

    it('returns true when DB value is true', async () => {
      mockSettingsService.getSettingValue.mockResolvedValueOnce(true);
      const result = await service.resolveCombinedScoreEnabled();
      expect(result).toBe(true);
    });

    it('returns false when DB value is null', async () => {
      mockSettingsService.getSettingValue.mockResolvedValueOnce(null);
      const result = await service.resolveCombinedScoreEnabled();
      expect(result).toBe(false);
    });
  });

  describe('resolveQualityWeight', () => {
    it('returns 0.80 by default', async () => {
      const result = await service.resolveQualityWeight();
      expect(result).toBe(0.8);
    });

    it('returns DB value when configured', async () => {
      mockSettingsService.getSettingValue.mockResolvedValueOnce(0.7);
      const result = await service.resolveQualityWeight();
      expect(result).toBe(0.7);
    });
  });

  describe('resolvePlanningWeight', () => {
    it('returns 0.20 by default', async () => {
      const result = await service.resolvePlanningWeight();
      expect(result).toBe(0.2);
    });

    it('returns DB value when configured', async () => {
      mockSettingsService.getSettingValue.mockResolvedValueOnce(0.3);
      const result = await service.resolvePlanningWeight();
      expect(result).toBe(0.3);
    });
  });
});

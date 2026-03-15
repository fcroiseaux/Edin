import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ZenhubConfigController } from './zenhub-config.controller.js';
import { ZenhubConfigService } from './zenhub-config.service.js';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';
import type { ZenhubConfigResponse } from '@edin/shared';

const mockConfig: ZenhubConfigResponse = {
  apiTokenConfigured: true,
  apiTokenHint: '****c123',
  webhookUrl: 'https://example.com/webhooks/zenhub',
  webhookSecretConfigured: true,
  pollingIntervalMs: 900_000,
  workspaceMapping: { ws1: 'Technology' },
};

const mockService = {
  getConfig: vi.fn().mockResolvedValue(mockConfig),
  updateConfig: vi.fn().mockResolvedValue(mockConfig),
};

describe('ZenhubConfigController', () => {
  let controller: ZenhubConfigController;

  const mockRequest = { correlationId: 'test-corr' } as never;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [ZenhubConfigController],
      providers: [
        { provide: ZenhubConfigService, useValue: mockService },
        { provide: CaslAbilityFactory, useValue: {} },
      ],
    }).compile();

    controller = module.get(ZenhubConfigController);
  });

  describe('getConfig', () => {
    it('returns config in success envelope', async () => {
      const result = await controller.getConfig(mockRequest);

      expect(result.data).toEqual(mockConfig);
      expect(result.meta.correlationId).toBe('test-corr');
      expect(mockService.getConfig).toHaveBeenCalled();
    });
  });

  describe('updateConfig', () => {
    it('validates and updates config', async () => {
      const body = { pollingIntervalMs: 600_000 };
      const result = await controller.updateConfig(body, 'admin-id', mockRequest);

      expect(result.data).toEqual(mockConfig);
      expect(mockService.updateConfig).toHaveBeenCalledWith(
        { pollingIntervalMs: 600_000 },
        'admin-id',
        'test-corr',
      );
    });

    it('rejects invalid body with validation error', async () => {
      const body = { pollingIntervalMs: 100 }; // Below minimum 60000

      await expect(controller.updateConfig(body, 'admin-id', mockRequest)).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
      });
    });

    it('rejects non-URL webhook URL', async () => {
      const body = { webhookUrl: 'not-a-url' };

      await expect(controller.updateConfig(body, 'admin-id', mockRequest)).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
      });
    });

    it('accepts valid webhook URL', async () => {
      const body = { webhookUrl: 'https://example.com/webhooks/zenhub' };
      const result = await controller.updateConfig(body, 'admin-id', mockRequest);

      expect(result.data).toEqual(mockConfig);
    });

    it('accepts empty body (no-op)', async () => {
      const body = {};
      const result = await controller.updateConfig(body, 'admin-id', mockRequest);

      expect(result.data).toEqual(mockConfig);
    });
  });
});

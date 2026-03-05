import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { IngestionController } from './ingestion.controller.js';
import { IngestionService } from './ingestion.service.js';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

const mockIngestionService = {
  addRepository: vi.fn(),
  removeRepository: vi.fn(),
  listRepositories: vi.fn(),
  getRepository: vi.fn(),
  retryWebhook: vi.fn(),
  validateWebhookSignature: vi.fn(),
  dispatchWebhookEvent: vi.fn(),
};

const mockUser = {
  id: 'admin-uuid-1',
  githubId: 1,
  name: 'Test Admin',
  email: 'admin@test.com',
  avatarUrl: null,
  role: 'ADMIN',
};

const mockReq = {
  correlationId: 'test-correlation-id',
  user: mockUser,
} as any;

describe('IngestionController', () => {
  let controller: IngestionController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }])],
      controllers: [IngestionController],
      providers: [
        { provide: IngestionService, useValue: mockIngestionService },
        CaslAbilityFactory,
        Reflector,
        AbilityGuard,
      ],
    }).compile();

    controller = module.get(IngestionController);
  });

  // ─── addRepository ─────────────────────────────────────────────────────

  describe('addRepository', () => {
    it('should validate and add repository', async () => {
      const mockResponse = {
        id: 'repo-1',
        owner: 'org',
        repo: 'repo',
        fullName: 'org/repo',
        status: 'ACTIVE',
      };
      mockIngestionService.addRepository.mockResolvedValue(mockResponse);

      const result = await controller.addRepository(
        { owner: 'org', repo: 'repo' },
        mockUser as any,
        mockReq,
      );

      expect(result.data).toEqual(mockResponse);
      expect(mockIngestionService.addRepository).toHaveBeenCalledWith(
        { owner: 'org', repo: 'repo' },
        'admin-uuid-1',
        'test-correlation-id',
      );
    });

    it('should throw validation error for invalid body', async () => {
      await expect(
        controller.addRepository({ invalid: true } as any, mockUser as any, mockReq),
      ).rejects.toBeInstanceOf(DomainException);
    });
  });

  // ─── listRepositories ──────────────────────────────────────────────────

  describe('listRepositories', () => {
    it('should list repositories with pagination', async () => {
      const mockResult = {
        items: [{ id: 'repo-1', fullName: 'org/repo' }],
        pagination: { cursor: null, hasMore: false, total: 1 },
      };
      mockIngestionService.listRepositories.mockResolvedValue(mockResult);

      const result = await controller.listRepositories({ limit: '20' }, mockReq);

      expect(result.data).toEqual(mockResult.items);
      expect(result.meta.pagination).toEqual(mockResult.pagination);
    });
  });

  // ─── getRepository ─────────────────────────────────────────────────────

  describe('getRepository', () => {
    it('should return single repository', async () => {
      const mockResponse = { id: 'repo-1', fullName: 'org/repo' };
      mockIngestionService.getRepository.mockResolvedValue(mockResponse);

      const result = await controller.getRepository('repo-1', mockReq);

      expect(result.data).toEqual(mockResponse);
    });
  });

  // ─── removeRepository ──────────────────────────────────────────────────

  describe('removeRepository', () => {
    it('should remove repository', async () => {
      mockIngestionService.removeRepository.mockResolvedValue(undefined);

      const result = await controller.removeRepository('repo-1', mockUser as any, mockReq);

      expect(result.data).toEqual({ deleted: true });
      expect(mockIngestionService.removeRepository).toHaveBeenCalledWith(
        'repo-1',
        'admin-uuid-1',
        'test-correlation-id',
      );
    });
  });

  // ─── retryWebhook ─────────────────────────────────────────────────────

  describe('retryWebhook', () => {
    it('should retry webhook registration', async () => {
      const mockResponse = { id: 'repo-1', status: 'ACTIVE' };
      mockIngestionService.retryWebhook.mockResolvedValue(mockResponse);

      const result = await controller.retryWebhook('repo-1', mockUser as any, mockReq);

      expect(result.data).toEqual(mockResponse);
    });
  });

  // ─── receiveWebhook ────────────────────────────────────────────────────

  describe('receiveWebhook', () => {
    it('should reject missing signature header', async () => {
      await expect(
        controller.receiveWebhook(undefined, 'push', 'delivery-1', {
          rawBody: Buffer.from('{}'),
          correlationId: 'test',
        } as any),
      ).rejects.toBeInstanceOf(DomainException);
    });

    it('should reject missing event type header', async () => {
      await expect(
        controller.receiveWebhook('sha256=abc', undefined, 'delivery-1', {
          rawBody: Buffer.from('{}'),
          correlationId: 'test',
        } as any),
      ).rejects.toBeInstanceOf(DomainException);
    });

    it('should reject invalid signature', async () => {
      const payload = JSON.stringify({ repository: { full_name: 'org/repo' } });
      mockIngestionService.validateWebhookSignature.mockResolvedValue(false);

      await expect(
        controller.receiveWebhook('sha256=invalid', 'push', 'delivery-1', {
          rawBody: Buffer.from(payload),
          correlationId: 'test',
        } as any),
      ).rejects.toBeInstanceOf(DomainException);
    });

    it('should dispatch valid webhook event', async () => {
      const payload = JSON.stringify({ repository: { full_name: 'org/repo' }, commits: [] });
      mockIngestionService.validateWebhookSignature.mockResolvedValue(true);
      mockIngestionService.dispatchWebhookEvent.mockResolvedValue(undefined);

      const result = await controller.receiveWebhook('sha256=valid', 'push', 'delivery-1', {
        rawBody: Buffer.from(payload),
        correlationId: 'test',
      } as any);

      expect(result).toEqual({ status: 'accepted' });
      expect(mockIngestionService.dispatchWebhookEvent).toHaveBeenCalledWith(
        'push',
        'org/repo',
        expect.objectContaining({ repository: { full_name: 'org/repo' } }),
        'delivery-1',
      );
    });
  });
});

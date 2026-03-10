import { Test } from '@nestjs/testing';
import { AdminContributorsController } from './contributors.controller.js';
import { AdminContributorsService } from './contributors.service.js';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';
import { Reflector } from '@nestjs/core';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockContributorsService = {
  list: vi.fn(),
};

describe('AdminContributorsController', () => {
  let controller: AdminContributorsController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [AdminContributorsController],
      providers: [
        { provide: AdminContributorsService, useValue: mockContributorsService },
        { provide: CaslAbilityFactory, useValue: {} },
        { provide: Reflector, useValue: new Reflector() },
      ],
    }).compile();

    controller = module.get(AdminContributorsController);
  });

  describe('listContributors', () => {
    const mockResult = {
      data: [
        {
          id: 'uuid-1',
          name: 'Alice',
          email: 'alice@example.com',
          role: 'CONTRIBUTOR',
          domain: 'TECHNOLOGY',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
          isActive: true,
        },
      ],
      pagination: { nextCursor: null, hasMore: false, limit: 20 },
      total: 1,
    };

    it('returns contributor list with pagination', async () => {
      mockContributorsService.list.mockResolvedValueOnce(mockResult);

      const result = await controller.listContributors(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { correlationId: 'test-corr-id' } as any,
      );

      expect(result.data).toHaveLength(1);
      expect(result.meta.correlationId).toBe('test-corr-id');
    });

    it('passes search and filter params to service', async () => {
      mockContributorsService.list.mockResolvedValueOnce(mockResult);

      await controller.listContributors('alice', 'CONTRIBUTOR', 'TECHNOLOGY', undefined, '10', {
        correlationId: 'corr',
      } as any);

      expect(mockContributorsService.list).toHaveBeenCalledWith({
        search: 'alice',
        role: 'CONTRIBUTOR',
        domain: 'TECHNOLOGY',
        cursor: undefined,
        limit: 10,
      });
    });

    it('handles cursor pagination parameter', async () => {
      mockContributorsService.list.mockResolvedValueOnce(mockResult);
      const cursor = 'some-cursor-value';

      await controller.listContributors(undefined, undefined, undefined, cursor, undefined, {
        correlationId: 'corr',
      } as any);

      expect(mockContributorsService.list).toHaveBeenCalledWith(
        expect.objectContaining({ cursor }),
      );
    });

    it('handles invalid limit string gracefully', async () => {
      mockContributorsService.list.mockResolvedValueOnce(mockResult);

      await controller.listContributors(
        undefined,
        undefined,
        undefined,
        undefined,
        'not-a-number',
        { correlationId: 'corr' } as any,
      );

      expect(mockContributorsService.list).toHaveBeenCalledWith(
        expect.objectContaining({ limit: undefined }),
      );
    });

    it('includes pagination meta in response', async () => {
      const paginatedResult = {
        data: mockResult.data,
        pagination: { nextCursor: 'abc123', hasMore: true, limit: 20 },
        total: 50,
      };
      mockContributorsService.list.mockResolvedValueOnce(paginatedResult);

      const result = await controller.listContributors(
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { correlationId: 'corr' } as any,
      );

      expect(result.meta.pagination).toBeDefined();
      expect(result.meta.pagination?.cursor).toBe('abc123');
      expect(result.meta.pagination?.hasMore).toBe(true);
    });
  });
});

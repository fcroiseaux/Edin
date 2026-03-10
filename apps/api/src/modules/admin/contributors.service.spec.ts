import { Test } from '@nestjs/testing';
import { AdminContributorsService } from './contributors.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma: {
  contributor: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
} = {
  contributor: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
};

describe('AdminContributorsService', () => {
  let service: AdminContributorsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrisma.contributor.count.mockResolvedValue(0);

    const module = await Test.createTestingModule({
      providers: [AdminContributorsService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();

    service = module.get(AdminContributorsService);
  });

  describe('list', () => {
    const mockContributors = [
      {
        id: 'uuid-1',
        name: 'Alice',
        email: 'alice@example.com',
        role: 'CONTRIBUTOR',
        domain: 'TECHNOLOGY',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-03-01'),
        isActive: true,
      },
      {
        id: 'uuid-2',
        name: 'Bob',
        email: 'bob@example.com',
        role: 'ADMIN',
        domain: 'FINTECH',
        createdAt: new Date('2026-01-15'),
        updatedAt: new Date('2026-02-28'),
        isActive: true,
      },
    ];

    it('returns paginated contributors with default limit', async () => {
      mockPrisma.contributor.findMany.mockResolvedValueOnce(mockContributors);
      mockPrisma.contributor.count.mockResolvedValueOnce(2);

      const result = await service.list({});

      expect(result.data).toHaveLength(2);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.nextCursor).toBeNull();
      expect(result.pagination.limit).toBe(20);
      expect(result.total).toBe(2);
      expect(mockPrisma.contributor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 21, orderBy: { createdAt: 'desc' } }),
      );
    });

    it('applies search filter on name and email', async () => {
      mockPrisma.contributor.findMany.mockResolvedValueOnce([mockContributors[0]]);

      const result = await service.list({ search: 'alice' });

      expect(result.data).toHaveLength(1);
      expect(mockPrisma.contributor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'alice', mode: 'insensitive' } },
              { email: { contains: 'alice', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('applies role filter', async () => {
      mockPrisma.contributor.findMany.mockResolvedValueOnce([mockContributors[1]]);

      const result = await service.list({ role: 'ADMIN' });

      expect(result.data).toHaveLength(1);
      expect(mockPrisma.contributor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'ADMIN' }),
        }),
      );
    });

    it('applies domain filter', async () => {
      mockPrisma.contributor.findMany.mockResolvedValueOnce([mockContributors[0]]);

      const result = await service.list({ domain: 'TECHNOLOGY' });

      expect(result.data).toHaveLength(1);
      expect(mockPrisma.contributor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ domain: 'TECHNOLOGY' }),
        }),
      );
    });

    it('returns hasMore and nextCursor when more results exist', async () => {
      // Return 3 items to indicate hasMore (limit is 2)
      const threeItems = [...mockContributors, { ...mockContributors[0], id: 'uuid-3' }];
      mockPrisma.contributor.findMany.mockResolvedValueOnce(threeItems);

      const result = await service.list({ limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.nextCursor).toBeTruthy();
    });

    it('handles cursor-based pagination', async () => {
      const cursor = Buffer.from(JSON.stringify({ id: 'uuid-1' }), 'utf8').toString('base64url');
      mockPrisma.contributor.findMany.mockResolvedValueOnce([mockContributors[1]]);

      const result = await service.list({ cursor });

      expect(result.data).toHaveLength(1);
      expect(mockPrisma.contributor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 'uuid-1' },
          skip: 1,
        }),
      );
    });

    it('returns empty results when no contributors match', async () => {
      mockPrisma.contributor.findMany.mockResolvedValueOnce([]);

      const result = await service.list({ search: 'nonexistent' });

      expect(result.data).toHaveLength(0);
      expect(result.pagination.hasMore).toBe(false);
      expect(result.pagination.nextCursor).toBeNull();
    });

    it('caps limit to 100', async () => {
      mockPrisma.contributor.findMany.mockResolvedValueOnce([]);

      await service.list({ limit: 200 });

      expect(mockPrisma.contributor.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 101 }),
      );
    });
  });
});

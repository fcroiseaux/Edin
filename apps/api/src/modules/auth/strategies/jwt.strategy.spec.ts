import { JwtStrategy } from './jwt.strategy.js';
import { DomainException } from '../../../common/exceptions/domain.exception.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExtractJwt } from 'passport-jwt';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockPrisma: { contributor: { findUnique: ReturnType<typeof vi.fn> } };

  const mockContributor = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    githubId: 12345,
    name: 'Test User',
    email: 'test@example.com',
    avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
    role: 'APPLICANT',
    isActive: true,
  };

  beforeEach(() => {
    mockPrisma = {
      contributor: {
        findUnique: vi.fn(),
      },
    };

    // Create instance without calling super() which needs real JWT config
    strategy = Object.create(JwtStrategy.prototype);
    (strategy as any).prisma = mockPrisma;
    (strategy as any).logger = { warn: vi.fn() };
  });

  describe('validate', () => {
    it('should return contributor data for valid JWT payload', async () => {
      mockPrisma.contributor.findUnique.mockResolvedValueOnce(mockContributor);

      const payload = {
        sub: mockContributor.id,
        role: 'APPLICANT',
        iat: 1234567890,
        exp: 1234568790,
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: mockContributor.id,
        githubId: 12345,
        name: 'Test User',
        email: 'test@example.com',
        avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
        role: 'APPLICANT',
      });
      expect(mockPrisma.contributor.findUnique).toHaveBeenCalledWith({
        where: { id: mockContributor.id },
      });
    });

    it('should throw when contributor not found', async () => {
      mockPrisma.contributor.findUnique.mockResolvedValueOnce(null);

      const payload = {
        sub: 'nonexistent-id',
        role: 'APPLICANT',
        iat: 1234567890,
        exp: 1234568790,
      };

      await expect(strategy.validate(payload)).rejects.toThrow(DomainException);
    });

    it('should throw when contributor is inactive', async () => {
      mockPrisma.contributor.findUnique.mockResolvedValueOnce({
        ...mockContributor,
        isActive: false,
      });

      const payload = {
        sub: mockContributor.id,
        role: 'APPLICANT',
        iat: 1234567890,
        exp: 1234568790,
      };

      await expect(strategy.validate(payload)).rejects.toThrow(DomainException);
    });
  });

  describe('SSE query token extractor', () => {
    it('accepts a token passed as a query parameter', () => {
      const extractor = ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: { query?: Record<string, unknown> }) =>
          typeof request.query?.token === 'string' ? request.query.token : null,
      ]);

      const token = extractor({ headers: {}, query: { token: 'sse-token' } } as never);

      expect(token).toBe('sse-token');
    });
  });
});

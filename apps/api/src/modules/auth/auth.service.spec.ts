import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { AuditService } from '../compliance/audit/audit.service.js';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    contributor: { findUnique: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> };
  };
  let mockAuditService: { log: ReturnType<typeof vi.fn> };
  let jwtService: { signAsync: ReturnType<typeof vi.fn> };
  let redisService: {
    setRefreshToken: ReturnType<typeof vi.fn>;
    getRefreshToken: ReturnType<typeof vi.fn>;
    deleteRefreshToken: ReturnType<typeof vi.fn>;
    deleteAllRefreshTokens: ReturnType<typeof vi.fn>;
  };

  const mockContributor = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    githubId: 12345,
    githubUsername: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
    avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
    role: 'APPLICANT',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prisma = {
      contributor: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    };

    mockAuditService = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    jwtService = {
      signAsync: vi.fn().mockResolvedValue('mock.jwt.token'),
    };

    redisService = {
      setRefreshToken: vi.fn().mockResolvedValue(undefined),
      getRefreshToken: vi.fn().mockResolvedValue(null),
      deleteRefreshToken: vi.fn().mockResolvedValue(undefined),
      deleteAllRefreshTokens: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: RedisService, useValue: redisService },
        { provide: AuditService, useValue: mockAuditService },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                REFRESH_TOKEN_EXPIRATION: '30d',
                JWT_EXPIRATION: '15m',
              };
              return config[key] ?? defaultValue;
            }),
            getOrThrow: vi.fn().mockReturnValue('test-secret'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateGithubUser', () => {
    const githubProfile = {
      githubId: 12345,
      username: 'testuser',
      displayName: 'Test User',
      email: 'test@example.com',
      avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
    };

    it('should create a new contributor on first login', async () => {
      prisma.contributor.findUnique.mockResolvedValueOnce(null);
      prisma.contributor.upsert.mockResolvedValueOnce(mockContributor);
      mockAuditService.log.mockResolvedValueOnce({});

      const result = await service.validateGithubUser(githubProfile, 'corr-123');

      expect(result.isNewUser).toBe(true);
      expect(result.contributor.id).toBe(mockContributor.id);
      expect(prisma.contributor.upsert).toHaveBeenCalledWith({
        where: { githubId: 12345 },
        create: expect.objectContaining({
          githubId: 12345,
          githubUsername: 'testuser',
          name: 'Test User',
          role: 'APPLICANT',
        }),
        update: expect.objectContaining({
          githubUsername: 'testuser',
          name: 'Test User',
        }),
      });
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should update existing contributor on subsequent login', async () => {
      prisma.contributor.findUnique.mockResolvedValueOnce(mockContributor);
      prisma.contributor.upsert.mockResolvedValueOnce(mockContributor);

      const result = await service.validateGithubUser(githubProfile, 'corr-456');

      expect(result.isNewUser).toBe(false);
      expect(result.contributor.id).toBe(mockContributor.id);
      expect(mockAuditService.log).not.toHaveBeenCalled();
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      const contributor = { id: mockContributor.id, role: 'APPLICANT' };

      const tokens = await service.generateTokens(contributor);

      expect(tokens.accessToken).toBe('mock.jwt.token');
      expect(tokens.expiresIn).toBe(900); // 15m = 900s
      expect(tokens.refreshToken).toContain(mockContributor.id);
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: mockContributor.id,
        role: 'APPLICANT',
      });
      expect(redisService.setRefreshToken).toHaveBeenCalledWith(
        mockContributor.id,
        expect.any(String),
        2592000, // 30d in seconds
      );
    });
  });

  describe('refreshTokens', () => {
    it('should rotate refresh tokens', async () => {
      const tokenId = 'old-token-id';
      const refreshToken = `${mockContributor.id}:${tokenId}`;

      redisService.getRefreshToken.mockResolvedValueOnce({
        contributorId: mockContributor.id,
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
      });
      prisma.contributor.findUnique.mockResolvedValueOnce(mockContributor);

      const tokens = await service.refreshTokens(refreshToken, 'corr-789');

      expect(redisService.deleteRefreshToken).toHaveBeenCalledWith(mockContributor.id, tokenId);
      expect(tokens.accessToken).toBe('mock.jwt.token');
      expect(redisService.setRefreshToken).toHaveBeenCalled();
    });

    it('should throw on invalid refresh token format', async () => {
      await expect(service.refreshTokens('invalid-token', 'corr-000')).rejects.toThrow(
        DomainException,
      );
    });

    it('should throw when refresh token not found in Redis', async () => {
      redisService.getRefreshToken.mockResolvedValueOnce(null);

      await expect(
        service.refreshTokens(`${mockContributor.id}:expired-token`, 'corr-111'),
      ).rejects.toThrow(DomainException);
    });

    it('should throw when contributor is inactive', async () => {
      const tokenId = 'valid-token';
      redisService.getRefreshToken.mockResolvedValueOnce({
        contributorId: mockContributor.id,
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
      });
      prisma.contributor.findUnique.mockResolvedValueOnce({
        ...mockContributor,
        isActive: false,
      });

      await expect(
        service.refreshTokens(`${mockContributor.id}:${tokenId}`, 'corr-222'),
      ).rejects.toThrow(DomainException);
    });
  });

  describe('logout', () => {
    it('should delete all refresh tokens for contributor', async () => {
      await service.logout(mockContributor.id, 'corr-333');

      expect(redisService.deleteAllRefreshTokens).toHaveBeenCalledWith(mockContributor.id);
    });
  });

  describe('createAuditLog', () => {
    it('should create an audit log entry', async () => {
      mockAuditService.log.mockResolvedValueOnce({});

      await service.createAuditLog(
        'CREATED',
        'contributor',
        mockContributor.id,
        { source: 'github_oauth' },
        'corr-444',
      );

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATED',
          entityType: 'contributor',
          entityId: mockContributor.id,
          correlationId: 'corr-444',
        }),
      );
    });
  });
});

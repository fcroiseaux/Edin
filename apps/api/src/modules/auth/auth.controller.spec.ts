import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ERROR_CODES } from '@edin/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { CaslAbilityFactory } from './casl/ability.factory.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    validateGithubUser: ReturnType<typeof vi.fn>;
    validateGoogleUser: ReturnType<typeof vi.fn>;
    generateTokens: ReturnType<typeof vi.fn>;
    refreshTokens: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
  };

  const mockTokens = {
    accessToken: 'mock.jwt.token',
    expiresIn: 900,
    refreshToken: 'contributor-id:token-id',
    refreshTokenId: 'token-id',
  };

  const mockContributor = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    githubId: 12345,
    name: 'Test User',
    email: 'test@example.com',
    avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
    role: 'APPLICANT',
  };

  beforeEach(async () => {
    authService = {
      validateGithubUser: vi.fn().mockResolvedValue({
        contributor: mockContributor,
        isNewUser: false,
      }),
      validateGoogleUser: vi.fn().mockResolvedValue({
        contributor: mockContributor,
        isNewUser: false,
      }),
      generateTokens: vi.fn().mockResolvedValue(mockTokens),
      refreshTokens: vi.fn().mockResolvedValue(mockTokens),
      logout: vi.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                FRONTEND_URL: 'http://localhost:3000',
                NODE_ENV: 'development',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        CaslAbilityFactory,
        Reflector,
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('githubLogin', () => {
    it('should be defined (Passport handles redirect)', () => {
      expect(typeof controller.githubLogin).toBe('function');
    });
  });

  describe('githubCallback', () => {
    it('should set refresh token cookie and redirect to frontend', async () => {
      const mockReq = {
        correlationId: 'corr-123',
        user: {
          githubId: 12345,
          displayName: 'Test User',
          email: 'test@example.com',
          avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
        },
      };

      const mockRes = {
        cookie: vi.fn(),
        redirect: vi.fn(),
      };

      await controller.githubCallback(mockReq as any, mockRes as any);

      expect(authService.validateGithubUser).toHaveBeenCalled();
      expect(authService.generateTokens).toHaveBeenCalledWith(mockContributor);
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'edin_refresh_token',
        mockTokens.refreshToken,
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          path: '/',
        }),
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:3000/api/auth/callback'),
      );
    });
  });

  describe('googleLogin', () => {
    it('is defined (Passport handles redirect)', () => {
      expect(typeof controller.googleLogin).toBe('function');
    });
  });

  describe('googleCallback', () => {
    it('sets refresh token cookie and redirects to frontend on success', async () => {
      const mockReq = {
        correlationId: 'corr-g-1',
        user: {
          googleId: 'g-117',
          displayName: 'Alice Doe',
          email: 'alice@example.com',
          emailVerified: true,
          avatarUrl: null,
        },
      };
      const mockRes = { cookie: vi.fn(), redirect: vi.fn() };

      await controller.googleCallback(mockReq as any, mockRes as any);

      expect(authService.validateGoogleUser).toHaveBeenCalledWith(mockReq.user, 'corr-g-1');
      expect(authService.generateTokens).toHaveBeenCalledWith(mockContributor);
      expect(mockRes.cookie).toHaveBeenCalledWith(
        'edin_refresh_token',
        mockTokens.refreshToken,
        expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/' }),
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:3000/api/auth/callback'),
      );
    });

    it('redirects to /sign-in?error=account_link_conflict on link conflict', async () => {
      authService.validateGoogleUser.mockRejectedValueOnce(
        new DomainException(
          ERROR_CODES.ACCOUNT_LINK_CONFLICT,
          'Email already linked to a different Google account',
          HttpStatus.CONFLICT,
        ),
      );
      const mockReq = { correlationId: 'corr-g-2', user: { googleId: 'g-1' } };
      const mockRes = { cookie: vi.fn(), redirect: vi.fn() };

      await controller.googleCallback(mockReq as any, mockRes as any);

      expect(mockRes.cookie).not.toHaveBeenCalled();
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/sign-in?error=account_link_conflict'),
      );
    });

    it('redirects to /sign-in?error=email_verification_required when verification message is set', async () => {
      authService.validateGoogleUser.mockRejectedValueOnce(
        new DomainException(
          ERROR_CODES.ACCOUNT_LINK_CONFLICT,
          'Verified email required to link to existing account',
          HttpStatus.CONFLICT,
        ),
      );
      const mockReq = { correlationId: 'corr-g-3', user: { googleId: 'g-1' } };
      const mockRes = { cookie: vi.fn(), redirect: vi.fn() };

      await controller.googleCallback(mockReq as any, mockRes as any);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('/sign-in?error=email_verification_required'),
      );
    });

    it('rethrows non-link-conflict errors', async () => {
      authService.validateGoogleUser.mockRejectedValueOnce(new Error('boom'));
      const mockReq = { correlationId: 'corr-g-4', user: { googleId: 'g-1' } };
      const mockRes = { cookie: vi.fn(), redirect: vi.fn() };

      await expect(controller.googleCallback(mockReq as any, mockRes as any)).rejects.toThrow(
        'boom',
      );
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });
  });

  describe('refreshTokens', () => {
    it('should return new tokens when valid refresh token cookie exists', async () => {
      const mockReq = {
        correlationId: 'corr-456',
        cookies: { edin_refresh_token: 'contributor-id:token-id' },
      };

      const mockRes = {
        cookie: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await controller.refreshTokens(mockReq as any, mockRes as any);

      expect(authService.refreshTokens).toHaveBeenCalledWith('contributor-id:token-id', 'corr-456');
      expect(mockRes.cookie).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accessToken: mockTokens.accessToken,
            expiresIn: mockTokens.expiresIn,
          }),
        }),
      );
    });

    it('should throw when no refresh token cookie', async () => {
      const mockReq = {
        correlationId: 'corr-789',
        cookies: {},
      };

      const mockRes = {
        cookie: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await expect(controller.refreshTokens(mockReq as any, mockRes as any)).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('should clear cookies and logout', async () => {
      const mockReq = {
        correlationId: 'corr-000',
        user: { id: mockContributor.id },
      };

      const mockRes = {
        clearCookie: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      await controller.logout(mockContributor.id, mockReq as any, mockRes as any);

      expect(authService.logout).toHaveBeenCalledWith(mockContributor.id, 'corr-000');
      expect(mockRes.clearCookie).toHaveBeenCalledWith(
        'edin_refresh_token',
        expect.objectContaining({ httpOnly: true }),
      );
      expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
    });
  });
});

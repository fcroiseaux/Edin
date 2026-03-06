import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { HttpStatus } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ERROR_CODES } from '@edin/shared';
import type { Prisma } from '../../../generated/prisma/client/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import type { GithubProfile } from './strategies/github.strategy.js';

interface TokenPair {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshTokenId: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly refreshTokenTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {
    this.refreshTokenTtlSeconds = this.parseExpirationToSeconds(
      this.configService.get<string>('REFRESH_TOKEN_EXPIRATION', '30d'),
    );
  }

  async validateGithubUser(
    profile: GithubProfile,
    correlationId?: string,
  ): Promise<{
    contributor: {
      id: string;
      role: string;
      githubId: number;
      name: string;
      email: string | null;
      avatarUrl: string | null;
    };
    isNewUser: boolean;
  }> {
    const existing = await this.prisma.contributor.findUnique({
      where: { githubId: profile.githubId },
    });

    const isNewUser = !existing;

    const contributor = await this.prisma.contributor.upsert({
      where: { githubId: profile.githubId },
      create: {
        githubId: profile.githubId,
        githubUsername: profile.username,
        name: profile.displayName,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
        role: 'APPLICANT',
      },
      update: {
        githubUsername: profile.username,
        name: profile.displayName,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
      },
    });

    if (isNewUser) {
      await this.createAuditLog(
        'CREATED',
        'contributor',
        contributor.id,
        { source: 'github_oauth', githubId: profile.githubId },
        correlationId,
      );
      this.logger.log('New contributor created via GitHub OAuth', {
        contributorId: contributor.id,
        isNewUser: true,
        correlationId,
      });
    } else {
      this.logger.log('Existing contributor logged in via GitHub OAuth', {
        contributorId: contributor.id,
        isNewUser: false,
        correlationId,
      });
    }

    return {
      contributor: {
        id: contributor.id,
        role: contributor.role,
        githubId: contributor.githubId,
        name: contributor.name,
        email: contributor.email,
        avatarUrl: contributor.avatarUrl,
      },
      isNewUser,
    };
  }

  async generateTokens(contributor: { id: string; role: string }): Promise<TokenPair> {
    const payload = { sub: contributor.id, role: contributor.role };
    const accessToken = await this.jwtService.signAsync(payload);

    const refreshTokenId = randomUUID();

    await this.redisService.setRefreshToken(
      contributor.id,
      refreshTokenId,
      this.refreshTokenTtlSeconds,
    );

    return {
      accessToken,
      expiresIn: this.parseExpirationToSeconds(
        this.configService.get<string>('JWT_EXPIRATION', '15m'),
      ),
      refreshToken: `${contributor.id}:${refreshTokenId}`,
      refreshTokenId,
    };
  }

  async refreshTokens(oldRefreshToken: string, correlationId?: string): Promise<TokenPair> {
    const parts = oldRefreshToken.split(':');
    if (parts.length < 2) {
      throw new DomainException(
        ERROR_CODES.REFRESH_TOKEN_INVALID,
        'Invalid refresh token format',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Refresh token format is contributorId:tokenId.
    // We split from the right to safely recover tokenId.
    const tokenId = parts[parts.length - 1];
    const contributorId = parts.slice(0, parts.length - 1).join(':');

    const tokenData = await this.redisService.getRefreshToken(contributorId, tokenId);

    if (!tokenData) {
      this.logger.warn('Refresh token not found or expired', {
        contributorId,
        correlationId,
      });
      throw new DomainException(
        ERROR_CODES.REFRESH_TOKEN_INVALID,
        'Refresh token is invalid or expired',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // Invalidate old token (rotation)
    await this.redisService.deleteRefreshToken(contributorId, tokenId);

    // Verify contributor still exists and is active
    const contributor = await this.prisma.contributor.findUnique({
      where: { id: contributorId },
    });

    if (!contributor || !contributor.isActive) {
      throw new DomainException(
        ERROR_CODES.TOKEN_INVALID,
        'Contributor not found or inactive',
        HttpStatus.UNAUTHORIZED,
      );
    }

    this.logger.debug('Token refreshed successfully', {
      contributorId,
      correlationId,
    });

    return this.generateTokens({ id: contributor.id, role: contributor.role });
  }

  async logout(contributorId: string, correlationId?: string): Promise<void> {
    await this.redisService.deleteAllRefreshTokens(contributorId);

    this.logger.log('Contributor logged out', {
      contributorId,
      correlationId,
    });
  }

  async createAuditLog(
    action: string,
    entityType: string,
    entityId: string,
    details?: Prisma.InputJsonValue,
    correlationId?: string,
    actorId?: string,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: actorId ?? null,
        action,
        entityType,
        entityId,
        details: details ?? undefined,
        correlationId: correlationId ?? undefined,
      },
    });
  }

  private parseExpirationToSeconds(expiration: string): number {
    const match = expiration.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 900; // Default 15 minutes
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}

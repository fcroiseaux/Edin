import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ERROR_CODES } from '@edin/shared';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { DomainException } from '../../../common/exceptions/domain.exception.js';
import { HttpStatus } from '@nestjs/common';
import type { Request } from 'express';

function extractJwtFromSseQuery(request: Request): string | null {
  const token = request.query.token;

  if (typeof token === 'string' && token.length > 0) {
    return token;
  }

  return null;
}

export interface JwtPayload {
  sub: string;
  role: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        extractJwtFromSseQuery,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const contributor = await this.prisma.contributor.findUnique({
      where: { id: payload.sub },
    });

    if (!contributor) {
      this.logger.warn('JWT validation failed: contributor not found', {
        contributorId: payload.sub,
      });
      throw new DomainException(
        ERROR_CODES.TOKEN_INVALID,
        'Invalid token: contributor not found',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!contributor.isActive) {
      this.logger.warn('JWT validation failed: contributor inactive', {
        contributorId: payload.sub,
      });
      throw new DomainException(
        ERROR_CODES.TOKEN_INVALID,
        'Invalid token: contributor is inactive',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return {
      id: contributor.id,
      githubId: contributor.githubId,
      googleId: contributor.googleId,
      name: contributor.name,
      email: contributor.email,
      avatarUrl: contributor.avatarUrl,
      role: contributor.role,
    };
  }
}

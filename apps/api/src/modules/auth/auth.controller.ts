import { Controller, Get, Post, Req, Res, UseGuards, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ERROR_CODES } from '@edin/shared';
import { AuthService } from './auth.service.js';
import type { GithubProfile } from './strategies/github.strategy.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { CheckAbility } from '../../common/decorators/check-ability.decorator.js';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../../common/decorators/current-user.decorator.js';
import { Action } from './casl/action.enum.js';

@Controller('auth')
export class AuthController {
  private readonly frontendUrl: string;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubLogin(): void {
    // Passport redirects to GitHub — this method body is never reached
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const correlationId = req.correlationId;
    const githubProfile = req.user as GithubProfile;

    const { contributor } = await this.authService.validateGithubUser(githubProfile, correlationId);

    const tokens = await this.authService.generateTokens(contributor);

    // Set refresh token as httpOnly secure cookie
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    res.cookie('edin_refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });

    // Redirect to frontend callback. Access token is obtained by frontend via /auth/refresh.
    const callbackUrl = new URL('/api/auth/callback', this.frontendUrl);

    res.redirect(callbackUrl.toString());
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, AbilityGuard)
  @CheckAbility((ability) => ability.can(Action.Read, 'Contributor'))
  getMe(@CurrentUser() user: CurrentUserPayload, @Req() req: Request) {
    return {
      data: user,
      meta: {
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
      },
    };
  }

  @Post('refresh')
  async refreshTokens(@Req() req: Request, @Res() res: Response): Promise<void> {
    const correlationId = req.correlationId;
    const oldRefreshToken = (req.cookies as Record<string, string> | undefined)?.edin_refresh_token;

    if (!oldRefreshToken) {
      throw new DomainException(
        ERROR_CODES.REFRESH_TOKEN_INVALID,
        'No refresh token provided',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const tokens = await this.authService.refreshTokens(oldRefreshToken, correlationId);

    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    res.cookie('edin_refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.status(HttpStatus.OK).json({
      data: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
      },
      meta: {
        timestamp: new Date().toISOString(),
        correlationId,
      },
    });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser('id') contributorId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const correlationId = req.correlationId;

    await this.authService.logout(contributorId, correlationId);

    res.clearCookie('edin_refresh_token', {
      httpOnly: true,
      secure: this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
      path: '/',
    });

    res.status(HttpStatus.OK).json({
      data: { message: 'Logged out successfully' },
      meta: {
        timestamp: new Date().toISOString(),
        correlationId,
      },
    });
  }
}

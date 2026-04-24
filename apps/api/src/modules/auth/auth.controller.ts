import { Controller, Get, Post, Req, Res, UseGuards, HttpStatus, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { ERROR_CODES } from '@edin/shared';
import { AuthService } from './auth.service.js';
import type { GithubProfile } from './strategies/github.strategy.js';
import type { GoogleProfile } from './strategies/google.strategy.js';
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
  private readonly logger = new Logger(AuthController.name);
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

    this.setRefreshCookie(res, tokens.refreshToken);

    // Redirect to frontend callback. Access token is obtained by frontend via /auth/refresh.
    const callbackUrl = new URL('/api/auth/callback', this.frontendUrl);
    res.redirect(callbackUrl.toString());
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin(): void {
    // Passport redirects to Google — this method body is never reached
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const correlationId = req.correlationId;
    const googleProfile = req.user as GoogleProfile;

    try {
      const { contributor } = await this.authService.validateGoogleUser(
        googleProfile,
        correlationId,
      );

      const tokens = await this.authService.generateTokens(contributor);

      this.setRefreshCookie(res, tokens.refreshToken);

      const callbackUrl = new URL('/api/auth/callback', this.frontendUrl);
      res.redirect(callbackUrl.toString());
    } catch (err) {
      if (err instanceof DomainException && err.errorCode === ERROR_CODES.ACCOUNT_LINK_CONFLICT) {
        // Map the two distinct ACCOUNT_LINK_CONFLICT cases to user-meaningful query strings.
        const errorParam = err.message.toLowerCase().includes('verified email')
          ? 'email_verification_required'
          : 'account_link_conflict';
        const signInUrl = new URL('/sign-in', this.frontendUrl);
        signInUrl.searchParams.set('error', errorParam);
        this.logger.warn('Google OAuth callback ended with account link conflict', {
          errorParam,
          correlationId,
        });
        res.redirect(signInUrl.toString());
        return;
      }
      throw err;
    }
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

    this.setRefreshCookie(res, tokens.refreshToken);

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

    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    res.clearCookie('edin_refresh_token', {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'strict',
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

  private setRefreshCookie(res: Response, refreshToken: string): void {
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    res.cookie('edin_refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
}

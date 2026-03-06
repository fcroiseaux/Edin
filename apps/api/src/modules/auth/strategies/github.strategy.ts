import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-github2';

export interface GithubProfile {
  githubId: number;
  username: string | null;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
}

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('GITHUB_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GITHUB_CALLBACK_URL'),
      scope: ['read:user', 'user:email'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): GithubProfile {
    const primaryEmail =
      profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;

    const avatarUrl = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;

    return {
      githubId: parseInt(profile.id, 10),
      username: profile.username || null,
      displayName: profile.displayName || profile.username || 'Unknown',
      email: primaryEmail,
      avatarUrl,
    };
  }
}

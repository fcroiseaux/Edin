import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-google-oauth20';

export interface GoogleProfile {
  googleId: string;
  displayName: string;
  email: string | null;
  emailVerified: boolean;
  avatarUrl: string | null;
}

interface GoogleProfileJson {
  email_verified?: boolean;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    super({
      clientID: configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['profile', 'email'],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): GoogleProfile {
    const primaryEmail =
      profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;

    const avatarUrl = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null;

    const profileJson = (profile._json ?? {}) as GoogleProfileJson;
    const emailVerified = profileJson.email_verified === true;

    return {
      googleId: profile.id,
      displayName: profile.displayName || primaryEmail || 'Unknown',
      email: primaryEmail,
      emailVerified,
      avatarUrl,
    };
  }
}

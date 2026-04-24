import { GoogleStrategy } from './google.strategy.js';
import type { Profile } from 'passport-google-oauth20';
import { beforeEach, describe, expect, it } from 'vitest';

describe('GoogleStrategy', () => {
  let strategy: GoogleStrategy;

  beforeEach(() => {
    // Avoid running the parent constructor (which requires real OAuth env vars)
    strategy = Object.create(GoogleStrategy.prototype);
  });

  describe('validate', () => {
    it('maps a verified Google profile to GoogleProfile', () => {
      const profile = {
        id: 'g-117',
        displayName: 'Alice Doe',
        emails: [{ value: 'alice@example.com' }],
        photos: [{ value: 'https://lh3.googleusercontent.com/a/alice' }],
        _json: { email_verified: true },
      } as unknown as Profile;

      const result = strategy.validate('access', 'refresh', profile);

      expect(result).toEqual({
        googleId: 'g-117',
        displayName: 'Alice Doe',
        email: 'alice@example.com',
        emailVerified: true,
        avatarUrl: 'https://lh3.googleusercontent.com/a/alice',
      });
    });

    it('flags emailVerified as false when Google omits the claim', () => {
      const profile = {
        id: 'g-118',
        displayName: 'Bob',
        emails: [{ value: 'bob@example.com' }],
        photos: [],
        _json: {},
      } as unknown as Profile;

      const result = strategy.validate('access', 'refresh', profile);

      expect(result.emailVerified).toBe(false);
      expect(result.email).toBe('bob@example.com');
    });

    it('flags emailVerified as false when the claim is literally false', () => {
      const profile = {
        id: 'g-119',
        displayName: 'Carol',
        emails: [{ value: 'carol@example.com' }],
        photos: [],
        _json: { email_verified: false },
      } as unknown as Profile;

      const result = strategy.validate('access', 'refresh', profile);

      expect(result.emailVerified).toBe(false);
    });

    it('handles missing email', () => {
      const profile = {
        id: 'g-120',
        displayName: 'Dave',
        emails: [],
        photos: [{ value: 'https://lh3.googleusercontent.com/a/dave' }],
        _json: { email_verified: true },
      } as unknown as Profile;

      const result = strategy.validate('access', 'refresh', profile);

      expect(result.email).toBeNull();
    });

    it('handles missing avatar', () => {
      const profile = {
        id: 'g-121',
        displayName: 'Eve',
        emails: [{ value: 'eve@example.com' }],
        photos: [],
        _json: { email_verified: true },
      } as unknown as Profile;

      const result = strategy.validate('access', 'refresh', profile);

      expect(result.avatarUrl).toBeNull();
    });

    it('falls back to email when displayName is empty', () => {
      const profile = {
        id: 'g-122',
        displayName: '',
        emails: [{ value: 'frank@example.com' }],
        photos: [],
        _json: { email_verified: true },
      } as unknown as Profile;

      const result = strategy.validate('access', 'refresh', profile);

      expect(result.displayName).toBe('frank@example.com');
    });

    it('uses "Unknown" when both displayName and email are missing', () => {
      const profile = {
        id: 'g-123',
        displayName: '',
        emails: [],
        photos: [],
        _json: {},
      } as unknown as Profile;

      const result = strategy.validate('access', 'refresh', profile);

      expect(result.displayName).toBe('Unknown');
    });
  });
});

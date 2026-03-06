import { GithubStrategy } from './github.strategy.js';
import type { Profile } from 'passport-github2';
import { beforeEach, describe, expect, it } from 'vitest';

describe('GithubStrategy', () => {
  let strategy: GithubStrategy;

  beforeEach(() => {
    // Use Object.create to avoid calling the parent constructor (which connects to GitHub)
    strategy = Object.create(GithubStrategy.prototype);
  });

  describe('validate', () => {
    it('should map GitHub profile to GithubProfile', () => {
      const profile = {
        id: '12345',
        displayName: 'Test User',
        username: 'testuser',
        emails: [{ value: 'test@example.com' }],
        photos: [{ value: 'https://avatars.githubusercontent.com/u/12345' }],
      } as unknown as Profile;

      const result = strategy.validate('access-token', 'refresh-token', profile);

      expect(result).toEqual({
        githubId: 12345,
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
      });
    });

    it('should handle missing emails', () => {
      const profile = {
        id: '12345',
        displayName: 'Test User',
        username: 'testuser',
        emails: [],
        photos: [{ value: 'https://avatars.githubusercontent.com/u/12345' }],
      } as unknown as Profile;

      const result = strategy.validate('access-token', 'refresh-token', profile);

      expect(result.email).toBeNull();
    });

    it('should handle missing photos', () => {
      const profile = {
        id: '12345',
        displayName: 'Test User',
        username: 'testuser',
        emails: [{ value: 'test@example.com' }],
        photos: [],
      } as unknown as Profile;

      const result = strategy.validate('access-token', 'refresh-token', profile);

      expect(result.avatarUrl).toBeNull();
    });

    it('should fall back to username when displayName is empty', () => {
      const profile = {
        id: '12345',
        displayName: '',
        username: 'testuser',
        emails: [{ value: 'test@example.com' }],
        photos: [{ value: 'https://avatars.githubusercontent.com/u/12345' }],
      } as unknown as Profile;

      const result = strategy.validate('access-token', 'refresh-token', profile);

      expect(result.displayName).toBe('testuser');
    });

    it('should use "Unknown" when both displayName and username are empty', () => {
      const profile = {
        id: '12345',
        displayName: '',
        username: '',
        emails: [],
        photos: [],
      } as unknown as Profile;

      const result = strategy.validate('access-token', 'refresh-token', profile);

      expect(result.displayName).toBe('Unknown');
    });

    it('should handle undefined emails array', () => {
      const profile = {
        id: '12345',
        displayName: 'Test User',
        username: 'testuser',
        photos: [{ value: 'https://avatars.githubusercontent.com/u/12345' }],
      } as unknown as Profile;

      const result = strategy.validate('access-token', 'refresh-token', profile);

      expect(result.email).toBeNull();
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ProfileController } from './profile.controller.js';
import { ContributorService } from './contributor.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

const mockContributorService = {
  getProfile: vi.fn(),
  getPublicProfile: vi.fn(),
  updateProfile: vi.fn(),
};

const mockContributor = {
  id: 'user-uuid-1',
  githubId: 12345,
  name: 'Test User',
  email: 'test@example.com',
  bio: 'Hello world',
  avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
  domain: 'Technology',
  skillAreas: ['TypeScript'],
  role: 'CONTRIBUTOR',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ProfileController', () => {
  let controller: ProfileController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        {
          provide: ContributorService,
          useValue: mockContributorService,
        },
      ],
    }).compile();

    controller = module.get(ProfileController);
  });

  describe('GET me', () => {
    it('returns contributor profile', async () => {
      mockContributorService.getProfile.mockResolvedValueOnce(mockContributor);

      const result = await controller.getMyProfile('user-uuid-1');

      expect(result).toEqual(mockContributor);
      expect(mockContributorService.getProfile).toHaveBeenCalledWith('user-uuid-1');
    });
  });

  describe('GET :id (public profile)', () => {
    const validUuid = '550e8400-e29b-41d4-a716-446655440000';
    const nonExistentUuid = '550e8400-e29b-41d4-a716-446655440999';
    const mockPublicProfile = {
      id: validUuid,
      name: 'Test User',
      avatarUrl: 'https://avatars.githubusercontent.com/u/12345',
      bio: 'Hello world',
      domain: 'Technology',
      skillAreas: ['TypeScript'],
      role: 'CONTRIBUTOR',
      createdAt: new Date(),
    };

    it('returns public profile for valid contributor id', async () => {
      mockContributorService.getPublicProfile.mockResolvedValueOnce(mockPublicProfile);

      const result = await controller.getPublicProfile(validUuid);

      expect(result).toEqual(mockPublicProfile);
      expect(mockContributorService.getPublicProfile).toHaveBeenCalledWith(validUuid);
    });

    it('throws CONTRIBUTOR_NOT_FOUND for non-existent contributor', async () => {
      mockContributorService.getPublicProfile.mockRejectedValueOnce(
        new DomainException('CONTRIBUTOR_NOT_FOUND', 'Contributor not found', 404),
      );

      let caughtError: DomainException | undefined;
      try {
        await controller.getPublicProfile(nonExistentUuid);
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('CONTRIBUTOR_NOT_FOUND');
    });

    it('throws CONTRIBUTOR_NOT_FOUND for invalid UUID format', async () => {
      let caughtError: DomainException | undefined;
      try {
        await controller.getPublicProfile('not-a-valid-uuid');
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('CONTRIBUTOR_NOT_FOUND');
      expect(caughtError!.getStatus()).toBe(404);
    });

    it('does not apply auth guards on GET :id public route', () => {
      const method = ProfileController.prototype.getPublicProfile;
      const guards = Reflect.getMetadata(GUARDS_METADATA, method);

      expect(guards).toBeUndefined();
    });
  });

  describe('PATCH me', () => {
    const mockReq = { correlationId: 'corr-123' } as any;

    it('returns updated profile on successful update', async () => {
      const updatedContributor = { ...mockContributor, bio: 'Updated bio' };
      mockContributorService.updateProfile.mockResolvedValueOnce(updatedContributor);

      const result = await controller.updateMyProfile(
        'user-uuid-1',
        { bio: 'Updated bio' },
        mockReq,
      );

      expect(result).toEqual(updatedContributor);
      expect(mockContributorService.updateProfile).toHaveBeenCalledWith(
        'user-uuid-1',
        { bio: 'Updated bio' },
        'corr-123',
      );
    });

    it('throws VALIDATION_ERROR with 400 for invalid data', async () => {
      let caughtError: DomainException | undefined;
      try {
        await controller.updateMyProfile('user-uuid-1', { invalidField: 'test' }, mockReq);
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('VALIDATION_ERROR');
      expect(caughtError!.getStatus()).toBe(400);
    });

    it('throws VALIDATION_ERROR when bio exceeds 500 characters', async () => {
      const longBio = 'a'.repeat(501);

      let caughtError: DomainException | undefined;
      try {
        await controller.updateMyProfile('user-uuid-1', { bio: longBio }, mockReq);
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('VALIDATION_ERROR');
      expect(caughtError!.getStatus()).toBe(400);
    });

    it('throws VALIDATION_ERROR when skillAreas exceeds 10 items', async () => {
      const tooManySkills = Array.from({ length: 11 }, (_, i) => `Skill${i}`);

      let caughtError: DomainException | undefined;
      try {
        await controller.updateMyProfile('user-uuid-1', { skillAreas: tooManySkills }, mockReq);
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('VALIDATION_ERROR');
      expect(caughtError!.getStatus()).toBe(400);
    });

    it('includes field details in validation error', async () => {
      let caughtError: DomainException | undefined;
      try {
        await controller.updateMyProfile('user-uuid-1', { bio: 'a'.repeat(501) }, mockReq);
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.details).toBeDefined();
      expect(caughtError!.details!.length).toBeGreaterThan(0);
      expect(caughtError!.details![0]).toHaveProperty('field');
      expect(caughtError!.details![0]).toHaveProperty('message');
    });
  });
});

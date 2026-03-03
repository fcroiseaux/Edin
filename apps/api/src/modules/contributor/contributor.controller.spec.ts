import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { ContributorController } from './contributor.controller.js';
import { ContributorService } from './contributor.service.js';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';

const mockContributorService = {
  updateRole: vi.fn(),
  designateFoundingContributor: vi.fn(),
};

describe('ContributorController', () => {
  let controller: ContributorController;
  let guard: AbilityGuard;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [ContributorController],
      providers: [
        {
          provide: ContributorService,
          useValue: mockContributorService,
        },
        CaslAbilityFactory,
        Reflector,
        AbilityGuard,
      ],
    }).compile();

    controller = module.get(ContributorController);
    guard = module.get(AbilityGuard);
  });

  describe('updateRole', () => {
    it('calls service with valid role change', async () => {
      const updatedContributor = {
        id: 'contributor-uuid-1',
        role: 'EDITOR',
      };
      mockContributorService.updateRole.mockResolvedValueOnce(updatedContributor);

      const result = await controller.updateRole(
        'contributor-uuid-1',
        { role: 'EDITOR' },
        'admin-uuid-1',
        { correlationId: 'corr-1' } as any,
      );

      expect(result).toEqual(updatedContributor);
      expect(mockContributorService.updateRole).toHaveBeenCalledWith(
        'contributor-uuid-1',
        { role: 'EDITOR' },
        'admin-uuid-1',
        'corr-1',
      );
    });

    it('throws VALIDATION_ERROR for invalid role value', async () => {
      let caughtError: DomainException | undefined;
      try {
        await controller.updateRole(
          'contributor-uuid-1',
          { role: 'INVALID_ROLE' },
          'admin-uuid-1',
          { correlationId: 'corr-1' } as any,
        );
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('VALIDATION_ERROR');
      expect(caughtError!.getStatus()).toBe(400);
    });

    it('throws VALIDATION_ERROR for missing role', async () => {
      await expect(
        controller.updateRole('contributor-uuid-1', {}, 'admin-uuid-1', {
          correlationId: 'corr-1',
        } as any),
      ).rejects.toThrow(DomainException);
    });

    it('propagates CONTRIBUTOR_NOT_FOUND from service', async () => {
      mockContributorService.updateRole.mockRejectedValueOnce(
        new DomainException('CONTRIBUTOR_NOT_FOUND' as any, 'Contributor not found', 404),
      );

      await expect(
        controller.updateRole('nonexistent-uuid', { role: 'ADMIN' }, 'admin-uuid-1', {
          correlationId: 'corr-1',
        } as any),
      ).rejects.toThrow(DomainException);
    });

    it('rejects non-admin access through AbilityGuard', () => {
      const request = {
        user: {
          id: 'contributor-uuid-1',
          githubId: 12345,
          name: 'Contributor User',
          email: 'contributor@example.com',
          avatarUrl: null,
          role: 'CONTRIBUTOR',
        },
        correlationId: 'corr-guard-1',
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
        getHandler: () => ContributorController.prototype.updateRole,
      } as unknown as ExecutionContext;

      let caughtError: DomainException | undefined;
      try {
        guard.canActivate(context);
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('AUTHORIZATION_DENIED');
      expect(caughtError!.getStatus()).toBe(403);
    });
  });

  describe('designateFoundingContributor', () => {
    it('calls service with valid designation request', async () => {
      const updatedContributor = {
        id: 'contributor-uuid-1',
        role: 'FOUNDING_CONTRIBUTOR',
      };
      mockContributorService.designateFoundingContributor.mockResolvedValueOnce(updatedContributor);

      const result = await controller.designateFoundingContributor(
        'contributor-uuid-1',
        { reason: 'Outstanding early contribution to project foundation' },
        'admin-uuid-1',
        { correlationId: 'corr-founding-1' } as any,
      );

      expect(result).toEqual(updatedContributor);
      expect(mockContributorService.designateFoundingContributor).toHaveBeenCalledWith(
        'contributor-uuid-1',
        'Outstanding early contribution to project foundation',
        'admin-uuid-1',
        'corr-founding-1',
      );
    });

    it('throws VALIDATION_ERROR for missing reason', async () => {
      let caughtError: DomainException | undefined;
      try {
        await controller.designateFoundingContributor('contributor-uuid-1', {}, 'admin-uuid-1', {
          correlationId: 'corr-1',
        } as any);
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('VALIDATION_ERROR');
      expect(caughtError!.getStatus()).toBe(400);
    });

    it('throws VALIDATION_ERROR for reason shorter than 10 characters', async () => {
      let caughtError: DomainException | undefined;
      try {
        await controller.designateFoundingContributor(
          'contributor-uuid-1',
          { reason: 'Short' },
          'admin-uuid-1',
          { correlationId: 'corr-1' } as any,
        );
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('VALIDATION_ERROR');
      expect(caughtError!.getStatus()).toBe(400);
    });

    it('propagates CONTRIBUTOR_ALREADY_EXISTS from service', async () => {
      mockContributorService.designateFoundingContributor.mockRejectedValueOnce(
        new DomainException(
          'CONTRIBUTOR_ALREADY_EXISTS' as any,
          'Contributor is already a Founding Contributor',
          409,
        ),
      );

      await expect(
        controller.designateFoundingContributor(
          'contributor-uuid-1',
          { reason: 'Outstanding early contribution to project foundation' },
          'admin-uuid-1',
          { correlationId: 'corr-1' } as any,
        ),
      ).rejects.toThrow(DomainException);
    });

    it('propagates CONTRIBUTOR_NOT_FOUND from service', async () => {
      mockContributorService.designateFoundingContributor.mockRejectedValueOnce(
        new DomainException('CONTRIBUTOR_NOT_FOUND' as any, 'Contributor not found', 404),
      );

      await expect(
        controller.designateFoundingContributor(
          'nonexistent-uuid',
          { reason: 'Outstanding early contribution to project foundation' },
          'admin-uuid-1',
          { correlationId: 'corr-1' } as any,
        ),
      ).rejects.toThrow(DomainException);
    });

    it('rejects non-admin access through AbilityGuard for founding-status', () => {
      const request = {
        user: {
          id: 'contributor-uuid-1',
          githubId: 12345,
          name: 'Contributor User',
          email: 'contributor@example.com',
          avatarUrl: null,
          role: 'CONTRIBUTOR',
        },
        correlationId: 'corr-guard-2',
      };

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
        getHandler: () => ContributorController.prototype.designateFoundingContributor,
      } as unknown as ExecutionContext;

      let caughtError: DomainException | undefined;
      try {
        guard.canActivate(context);
      } catch (e) {
        caughtError = e as DomainException;
      }

      expect(caughtError).toBeInstanceOf(DomainException);
      expect(caughtError!.errorCode).toBe('AUTHORIZATION_DENIED');
      expect(caughtError!.getStatus()).toBe(403);
    });
  });
});

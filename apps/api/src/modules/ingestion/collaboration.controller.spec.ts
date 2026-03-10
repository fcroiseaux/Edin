import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CollaborationController } from './collaboration.controller.js';
import { AuditService } from '../compliance/audit/audit.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';

describe('CollaborationController', () => {
  let controller: CollaborationController;
  let mockAuditService: { log: ReturnType<typeof vi.fn> };
  let prisma: {
    contributor: { findUnique: ReturnType<typeof vi.fn> };
    contributionCollaboration: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let eventEmitter: { emit: ReturnType<typeof vi.fn> };
  let redisService: { publish: ReturnType<typeof vi.fn> };

  const mockUser = {
    id: 'user-1',
    githubId: 100,
    name: 'Test',
    email: null,
    avatarUrl: null,
    role: 'CONTRIBUTOR',
  };
  const mockReq = { correlationId: 'corr-1' } as never;

  beforeEach(async () => {
    mockAuditService = { log: vi.fn().mockResolvedValue(undefined) };
    prisma = {
      contributor: { findUnique: vi.fn() },
      contributionCollaboration: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(<T>(fn: (tx: typeof prisma) => T) => fn(prisma)),
    };
    eventEmitter = { emit: vi.fn() };
    redisService = { publish: vi.fn() };

    const module = await Test.createTestingModule({
      controllers: [CollaborationController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: RedisService, useValue: redisService },
        { provide: CaslAbilityFactory, useValue: {} },
      ],
    }).compile();

    controller = module.get(CollaborationController);
  });

  describe('confirmCollaboration', () => {
    it('confirms own collaboration successfully', async () => {
      prisma.contributor.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.contributionCollaboration.findUnique.mockResolvedValue({
        id: 'collab-1',
        contributorId: 'user-1',
        contributionId: 'contrib-1',
        status: 'DETECTED',
      });
      prisma.contributionCollaboration.update.mockResolvedValue({
        id: 'collab-1',
        contributionId: 'contrib-1',
        contributorId: 'user-1',
        role: 'CO_AUTHOR',
        splitPercentage: 50,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      });

      redisService.publish.mockResolvedValue(undefined);

      const result = await controller.confirmCollaboration('collab-1', mockUser, mockReq);

      expect(result.data.status).toBe('CONFIRMED');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'contribution.collaboration.confirmed',
        expect.any(Object),
      );
    });

    it('throws 403 when confirming another contributor collaboration', async () => {
      prisma.contributor.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.contributionCollaboration.findUnique.mockResolvedValue({
        id: 'collab-1',
        contributorId: 'user-2', // Different contributor
        contributionId: 'contrib-1',
        status: 'DETECTED',
      });

      await expect(controller.confirmCollaboration('collab-1', mockUser, mockReq)).rejects.toThrow(
        DomainException,
      );

      await expect(
        controller.confirmCollaboration('collab-1', mockUser, mockReq),
      ).rejects.toMatchObject({ status: 403 });
    });

    it('throws 409 when collaboration already confirmed', async () => {
      prisma.contributor.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.contributionCollaboration.findUnique.mockResolvedValue({
        id: 'collab-1',
        contributorId: 'user-1',
        contributionId: 'contrib-1',
        status: 'CONFIRMED',
      });

      await expect(controller.confirmCollaboration('collab-1', mockUser, mockReq)).rejects.toThrow(
        DomainException,
      );
    });

    it('throws 404 when collaboration not found', async () => {
      prisma.contributor.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.contributionCollaboration.findUnique.mockResolvedValue(null);

      await expect(controller.confirmCollaboration('collab-1', mockUser, mockReq)).rejects.toThrow(
        DomainException,
      );
    });
  });

  describe('disputeCollaboration', () => {
    it('disputes collaboration with valid comment', async () => {
      prisma.contributor.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.contributionCollaboration.findUnique.mockResolvedValue({
        id: 'collab-1',
        contributorId: 'user-1',
        contributionId: 'contrib-1',
        status: 'DETECTED',
      });
      prisma.contributionCollaboration.update.mockResolvedValue({
        id: 'collab-1',
        contributionId: 'contrib-1',
        contributorId: 'user-1',
        role: 'CO_AUTHOR',
        splitPercentage: 50,
        status: 'DISPUTED',
        disputeComment: 'I was not involved in this work at all',
      });

      const result = await controller.disputeCollaboration(
        'collab-1',
        { comment: 'I was not involved in this work at all' },
        mockUser,
        mockReq,
      );

      expect(result.data.status).toBe('DISPUTED');
    });

    it('throws 400 when comment is less than 10 chars', async () => {
      prisma.contributor.findUnique.mockResolvedValue({ id: 'user-1' });

      await expect(
        controller.disputeCollaboration('collab-1', { comment: 'short' }, mockUser, mockReq),
      ).rejects.toThrow(DomainException);
    });

    it('throws 403 when disputing another contributor collaboration', async () => {
      prisma.contributor.findUnique.mockResolvedValue({ id: 'user-1' });
      prisma.contributionCollaboration.findUnique.mockResolvedValue({
        id: 'collab-1',
        contributorId: 'user-2',
        contributionId: 'contrib-1',
        status: 'DETECTED',
      });

      await expect(
        controller.disputeCollaboration(
          'collab-1',
          { comment: 'This needs review because I was not part of this' },
          mockUser,
          mockReq,
        ),
      ).rejects.toThrow(DomainException);
    });
  });
});

import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AdminContributionController } from './admin-contribution.controller.js';
import { AuditService } from '../compliance/audit/audit.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';
import { CollaborationDetectionService } from './services/collaboration-detection.service.js';

describe('AdminContributionController', () => {
  let controller: AdminContributionController;
  let mockAuditService: { log: ReturnType<typeof vi.fn> };
  let prisma: {
    contribution: { findUnique: ReturnType<typeof vi.fn> };
    contributor: { findUnique: ReturnType<typeof vi.fn> };
    contributionCollaboration: {
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let eventEmitter: { emit: ReturnType<typeof vi.fn> };
  let redisService: { publish: ReturnType<typeof vi.fn> };
  let collaborationDetectionService: { updateAttributionMetrics: ReturnType<typeof vi.fn> };

  const USER1_UUID = '00000000-0000-4000-a000-000000000001';
  const USER2_UUID = '00000000-0000-4000-a000-000000000002';
  const ADMIN_UUID = '00000000-0000-4000-a000-000000000099';
  const CONTRIB_UUID = '00000000-0000-4000-a000-000000000100';
  const mockAdmin = {
    id: ADMIN_UUID,
    githubId: 999,
    name: 'Admin',
    email: null,
    avatarUrl: null,
    role: 'ADMIN',
  };
  const mockReq = { correlationId: 'corr-1' } as never;

  beforeEach(async () => {
    mockAuditService = { log: vi.fn().mockResolvedValue(undefined) };
    prisma = {
      contribution: { findUnique: vi.fn() },
      contributor: { findUnique: vi.fn() },
      contributionCollaboration: {
        findMany: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn(<T>(fn: (tx: typeof prisma) => T) => fn(prisma)),
    };
    eventEmitter = { emit: vi.fn() };
    redisService = { publish: vi.fn() };
    collaborationDetectionService = { updateAttributionMetrics: vi.fn() };

    const module = await Test.createTestingModule({
      controllers: [AdminContributionController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: mockAuditService },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: RedisService, useValue: redisService },
        { provide: CollaborationDetectionService, useValue: collaborationDetectionService },
        { provide: CaslAbilityFactory, useValue: {} },
      ],
    }).compile();

    controller = module.get(AdminContributionController);
  });

  describe('overrideAttribution', () => {
    it('overrides with valid splits summing to 100', async () => {
      prisma.contribution.findUnique.mockResolvedValue({ id: CONTRIB_UUID });
      prisma.contributor.findUnique.mockResolvedValue({ id: ADMIN_UUID });
      prisma.contributionCollaboration.findMany.mockResolvedValue([
        { id: 'collab-1', contributorId: USER1_UUID, splitPercentage: 50, role: 'PRIMARY_AUTHOR' },
        { id: 'collab-2', contributorId: USER2_UUID, splitPercentage: 50, role: 'CO_AUTHOR' },
      ]);

      prisma.contributionCollaboration.update.mockResolvedValue({
        id: 'collab-1',
        contributionId: CONTRIB_UUID,
        contributorId: USER1_UUID,
        role: 'PRIMARY_AUTHOR',
        splitPercentage: 70,
        status: 'OVERRIDDEN',
      });
      prisma.contributionCollaboration.create
        .mockResolvedValueOnce({
          id: 'new-collab-1',
          contributionId: CONTRIB_UUID,
          contributorId: USER1_UUID,
          role: 'PRIMARY_AUTHOR',
          splitPercentage: 70,
          status: 'OVERRIDDEN',
        })
        .mockResolvedValueOnce({
          id: 'new-collab-2',
          contributionId: CONTRIB_UUID,
          contributorId: USER2_UUID,
          role: 'CO_AUTHOR',
          splitPercentage: 30,
          status: 'OVERRIDDEN',
        });

      redisService.publish.mockResolvedValue(undefined);
      collaborationDetectionService.updateAttributionMetrics.mockResolvedValue(undefined);

      const result = await controller.overrideAttribution(
        CONTRIB_UUID,
        {
          attributions: [
            { contributorId: USER1_UUID, splitPercentage: 70 },
            { contributorId: USER2_UUID, splitPercentage: 30 },
          ],
        },
        mockAdmin,
        mockReq,
      );

      expect(result.data).toBeDefined();
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'contribution.attribution.overridden',
        expect.any(Object),
      );
      expect(prisma.contributionCollaboration.create).toHaveBeenCalledTimes(2);
      expect(collaborationDetectionService.updateAttributionMetrics).toHaveBeenCalledWith('corr-1');
    });

    it('throws 400 when splits do not sum to 100', async () => {
      await expect(
        controller.overrideAttribution(
          CONTRIB_UUID,
          {
            attributions: [
              { contributorId: USER1_UUID, splitPercentage: 60 },
              { contributorId: USER2_UUID, splitPercentage: 30 },
            ],
          },
          mockAdmin,
          mockReq,
        ),
      ).rejects.toThrow(DomainException);
    });

    it('throws 404 when contribution not found', async () => {
      prisma.contribution.findUnique.mockResolvedValue(null);

      await expect(
        controller.overrideAttribution(
          CONTRIB_UUID,
          {
            attributions: [{ contributorId: USER1_UUID, splitPercentage: 100 }],
          },
          mockAdmin,
          mockReq,
        ),
      ).rejects.toThrow(DomainException);
    });

    it('creates audit log on override', async () => {
      prisma.contribution.findUnique.mockResolvedValue({ id: CONTRIB_UUID });
      prisma.contributor.findUnique.mockResolvedValue({ id: ADMIN_UUID });
      prisma.contributionCollaboration.findMany.mockResolvedValue([
        { id: 'collab-1', contributorId: USER1_UUID, splitPercentage: 50, role: 'PRIMARY_AUTHOR' },
      ]);
      prisma.contributionCollaboration.update.mockResolvedValue({
        id: 'collab-1',
        contributionId: CONTRIB_UUID,
        contributorId: USER1_UUID,
        role: 'PRIMARY_AUTHOR',
        splitPercentage: 100,
        status: 'OVERRIDDEN',
      });
      prisma.contributionCollaboration.create.mockResolvedValue({
        id: 'new-collab-1',
        contributionId: CONTRIB_UUID,
        contributorId: USER1_UUID,
        role: 'PRIMARY_AUTHOR',
        splitPercentage: 100,
        status: 'OVERRIDDEN',
      });

      redisService.publish.mockResolvedValue(undefined);
      collaborationDetectionService.updateAttributionMetrics.mockResolvedValue(undefined);

      await controller.overrideAttribution(
        CONTRIB_UUID,
        {
          attributions: [{ contributorId: USER1_UUID, splitPercentage: 100 }],
        },
        mockAdmin,
        mockReq,
      );

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'contribution.attribution.overridden',
        }),
        expect.anything(),
      );
    });
  });
});

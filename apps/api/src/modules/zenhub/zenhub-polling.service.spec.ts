import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { getQueueToken } from '@nestjs/bullmq';
import { ZenhubPollingService } from './zenhub-polling.service.js';
import { ZenhubGraphqlClient, ZenhubRateLimitError } from './zenhub-graphql.client.js';
import { ZenhubConfigService } from './zenhub-config.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const mockGraphqlClient = {
  query: vi.fn(),
};

const mockPrisma = {
  zenhubSync: {
    create: vi.fn(),
    update: vi.fn(),
  },
};

const mockZenhubConfigService = {
  resolveApiToken: vi.fn(),
  resolvePollingInterval: vi.fn().mockResolvedValue(900_000),
  resolveWorkspaceMapping: vi.fn(),
};

const mockEventEmitter = {
  emit: vi.fn(),
};

const mockQueue = {
  add: vi.fn(),
  getRepeatableJobs: vi.fn().mockResolvedValue([]),
  removeRepeatableByKey: vi.fn(),
};

describe('ZenhubPollingService', () => {
  let service: ZenhubPollingService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        ZenhubPollingService,
        { provide: ZenhubGraphqlClient, useValue: mockGraphqlClient },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ZenhubConfigService, useValue: mockZenhubConfigService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: getQueueToken('zenhub-polling'), useValue: mockQueue },
      ],
    }).compile();

    service = module.get(ZenhubPollingService);
  });

  describe('executePoll', () => {
    it('successfully polls, creates sync record, and emits completed event', async () => {
      mockZenhubConfigService.resolveApiToken.mockResolvedValue('token');
      mockZenhubConfigService.resolveWorkspaceMapping.mockResolvedValue({ ws1: 'Technology' });
      mockPrisma.zenhubSync.create.mockResolvedValue({ id: 'sync-1', deliveryId: 'poll-1' });
      mockPrisma.zenhubSync.update.mockResolvedValue({});

      // Mock sprints query (single page)
      mockGraphqlClient.query
        .mockResolvedValueOnce({
          workspace: {
            sprints: {
              nodes: [{ id: 's1', name: 'Sprint 1' }],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        })
        // Mock issues query (single page)
        .mockResolvedValueOnce({
          workspace: {
            issues: {
              nodes: [{ id: 'i1', number: 1 }],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        });

      await service.executePoll('corr-1');

      expect(mockPrisma.zenhubSync.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            syncType: 'POLL',
            status: 'RECEIVED',
          }),
        }),
      );

      expect(mockPrisma.zenhubSync.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sync-1' },
          data: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'zenhub.poll.completed',
        expect.objectContaining({
          eventType: 'zenhub.poll.completed',
          correlationId: 'corr-1',
          payload: expect.objectContaining({
            syncId: 'sync-1',
            sprintCount: 1,
            issueCount: 1,
          }),
        }),
      );
    });

    it('skips poll when API token is not configured', async () => {
      mockZenhubConfigService.resolveApiToken.mockResolvedValue(null);

      await service.executePoll('corr-2');

      expect(mockPrisma.zenhubSync.create).not.toHaveBeenCalled();
      expect(mockGraphqlClient.query).not.toHaveBeenCalled();
    });

    it('marks sync as FAILED and emits failed event on error', async () => {
      mockZenhubConfigService.resolveApiToken.mockResolvedValue('token');
      mockZenhubConfigService.resolveWorkspaceMapping.mockResolvedValue({ ws1: 'Tech' });
      mockPrisma.zenhubSync.create.mockResolvedValue({ id: 'sync-fail', deliveryId: 'poll-f' });
      mockPrisma.zenhubSync.update.mockResolvedValue({});
      mockGraphqlClient.query.mockRejectedValue(new ZenhubRateLimitError('Rate limited'));

      await expect(service.executePoll('corr-3')).rejects.toThrow('Rate limited');

      expect(mockPrisma.zenhubSync.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sync-fail' },
          data: expect.objectContaining({
            status: 'FAILED',
            errorMessage: 'Rate limited',
          }),
        }),
      );

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'zenhub.poll.failed',
        expect.objectContaining({
          eventType: 'zenhub.poll.failed',
          payload: expect.objectContaining({
            syncId: 'sync-fail',
            errorCode: 'ZENHUB_API_RATE_LIMITED',
          }),
        }),
      );
    });

    it('paginates through multiple pages of data', async () => {
      mockZenhubConfigService.resolveApiToken.mockResolvedValue('token');
      mockZenhubConfigService.resolveWorkspaceMapping.mockResolvedValue({ ws1: 'Tech' });
      mockPrisma.zenhubSync.create.mockResolvedValue({ id: 'sync-pg', deliveryId: 'poll-pg' });
      mockPrisma.zenhubSync.update.mockResolvedValue({});

      mockGraphqlClient.query
        // Sprints page 1
        .mockResolvedValueOnce({
          workspace: {
            sprints: {
              nodes: [{ id: 's1' }],
              pageInfo: { hasNextPage: true, endCursor: 'cursor-1' },
            },
          },
        })
        // Sprints page 2
        .mockResolvedValueOnce({
          workspace: {
            sprints: {
              nodes: [{ id: 's2' }],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        })
        // Issues (single page)
        .mockResolvedValueOnce({
          workspace: {
            issues: {
              nodes: [{ id: 'i1' }],
              pageInfo: { hasNextPage: false, endCursor: null },
            },
          },
        });

      await service.executePoll('corr-pg');

      expect(mockGraphqlClient.query).toHaveBeenCalledTimes(3);
      expect(mockPrisma.zenhubSync.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            payload: expect.objectContaining({
              sprintCount: 2,
              issueCount: 1,
            }),
          }),
        }),
      );
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { DataDeletionProcessor } from './data-deletion.processor.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { Job } from 'bullmq';
import type { DataDeletionJobData } from './data-deletion.processor.js';

const mockTx = {
  contributor: {
    update: vi.fn().mockResolvedValue({}),
  },
  dataDeletionRequest: {
    update: vi.fn().mockResolvedValue({}),
  },
  auditLog: {
    create: vi.fn().mockResolvedValue({}),
  },
};

const mockPrisma = {
  contributor: {
    update: vi.fn().mockResolvedValue({}),
  },
  dataDeletionRequest: {
    update: vi.fn().mockResolvedValue({}),
  },
  $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
};

const mockAuditService = { log: vi.fn().mockResolvedValue(undefined) };

function createJob(data: Partial<DataDeletionJobData> = {}): Job<DataDeletionJobData> {
  return {
    id: 'job-1',
    data: {
      contributorId: 'contributor-1',
      requestId: 'deletion-req-1',
      pseudonymId: 'pseudo-abc123',
      correlationId: 'corr-1',
      ...data,
    },
    attemptsMade: 0,
    opts: { attempts: 3 },
  } as unknown as Job<DataDeletionJobData>;
}

describe('DataDeletionProcessor', () => {
  let processor: DataDeletionProcessor;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx),
    );

    const module = await Test.createTestingModule({
      providers: [
        DataDeletionProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
        { provide: getQueueToken('gdpr-deletion'), useValue: {} },
      ],
    }).compile();

    processor = module.get(DataDeletionProcessor);
  });

  it('processes deletion job — nullifies PII and updates request to COMPLETED', async () => {
    await processor.process(createJob());

    expect(mockTx.contributor.update).toHaveBeenCalledWith({
      where: { id: 'contributor-1' },
      data: {
        name: '[deleted]',
        email: null,
        bio: null,
        githubId: 0,
        githubUsername: null,
        avatarUrl: null,
        isActive: false,
      },
    });

    expect(mockTx.dataDeletionRequest.update).toHaveBeenCalledWith({
      where: { id: 'deletion-req-1' },
      data: expect.objectContaining({
        status: 'COMPLETED',
      }),
    });
  });

  it('creates audit log with pseudonymId in details', async () => {
    await processor.process(createJob());

    expect(mockAuditService.log).toHaveBeenCalledWith(
      {
        actorId: 'contributor-1',
        action: 'data.deletion.completed',
        entityType: 'Contributor',
        entityId: 'contributor-1',
        details: { pseudonymId: 'pseudo-abc123' },
        correlationId: 'corr-1',
      },
      mockTx,
    );
  });

  it('uses prisma transaction for atomicity', async () => {
    await processor.process(createJob());

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    expect(mockPrisma.$transaction).toHaveBeenCalledWith(expect.any(Function));
  });

  it('propagates error when transaction fails', async () => {
    mockPrisma.$transaction.mockRejectedValue(new Error('Transaction failed'));

    await expect(processor.process(createJob())).rejects.toThrow('Transaction failed');
  });

  it('nullifies githubId during PII deletion', async () => {
    await processor.process(createJob());

    expect(mockTx.contributor.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          githubId: 0,
        }),
      }),
    );
  });
});

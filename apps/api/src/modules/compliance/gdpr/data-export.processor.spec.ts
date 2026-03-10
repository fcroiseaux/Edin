import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { DataExportProcessor } from './data-export.processor.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import type { Job } from 'bullmq';
import type { DataExportJobData } from './data-export.processor.js';

vi.mock('fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

const mockPrisma = {
  dataExportRequest: {
    update: vi.fn().mockResolvedValue({}),
  },
  contributor: {
    findUnique: vi.fn(),
  },
  contribution: {
    findMany: vi.fn(),
  },
  evaluation: {
    findMany: vi.fn(),
  },
  peerFeedback: {
    findMany: vi.fn(),
  },
  article: {
    findMany: vi.fn(),
  },
  contributionScore: {
    findMany: vi.fn(),
  },
  auditLog: {
    findMany: vi.fn(),
  },
};

const mockAuditService = { log: vi.fn().mockResolvedValue(undefined) };

function createJob(data: Partial<DataExportJobData> = {}): Job<DataExportJobData> {
  return {
    id: 'job-1',
    data: {
      contributorId: 'contributor-1',
      requestId: 'export-req-1',
      correlationId: 'corr-1',
      ...data,
    },
    attemptsMade: 0,
    opts: { attempts: 3 },
  } as unknown as Job<DataExportJobData>;
}

describe('DataExportProcessor', () => {
  let processor: DataExportProcessor;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockPrisma.contributor.findUnique.mockResolvedValue({
      id: 'contributor-1',
      name: 'Test User',
      email: 'test@example.com',
      bio: 'A bio',
      avatarUrl: 'https://example.com/avatar.png',
      domain: 'Technology',
      skillAreas: ['TypeScript'],
      role: 'CONTRIBUTOR',
      createdAt: new Date('2026-01-01'),
    });
    mockPrisma.contribution.findMany.mockResolvedValue([{ id: 'contrib-1' }]);
    mockPrisma.evaluation.findMany.mockResolvedValue([
      { compositeScore: 80, narrative: 'Good', dimensionScores: {}, createdAt: new Date() },
    ]);
    mockPrisma.peerFeedback.findMany.mockResolvedValue([
      { ratings: { quality: 4 }, comments: 'Nice', submittedAt: new Date() },
    ]);
    mockPrisma.article.findMany.mockResolvedValue([
      { title: 'Article 1', abstract: 'Abstract', status: 'PUBLISHED', publishedAt: new Date() },
    ]);
    mockPrisma.contributionScore.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);

    const module = await Test.createTestingModule({
      providers: [
        DataExportProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
        { provide: getQueueToken('gdpr-export'), useValue: {} },
      ],
    }).compile();

    processor = module.get(DataExportProcessor);
  });

  it('processes export job — collects data and updates request to READY', async () => {
    await processor.process(createJob());

    // Should update status to PROCESSING first
    expect(mockPrisma.dataExportRequest.update).toHaveBeenCalledWith({
      where: { id: 'export-req-1' },
      data: { status: 'PROCESSING' },
    });

    // Should collect data from all tables
    expect(mockPrisma.contributor.findUnique).toHaveBeenCalledWith({
      where: { id: 'contributor-1' },
      select: expect.objectContaining({ id: true, name: true, email: true }),
    });
    expect(mockPrisma.contribution.findMany).toHaveBeenCalledWith({
      where: { contributorId: 'contributor-1' },
    });
    expect(mockPrisma.evaluation.findMany).toHaveBeenCalledWith({
      where: { contributorId: 'contributor-1' },
      select: expect.objectContaining({ compositeScore: true, narrative: true }),
    });
    expect(mockPrisma.peerFeedback.findMany).toHaveBeenCalledWith({
      where: { reviewerId: 'contributor-1' },
      select: expect.objectContaining({ ratings: true, comments: true }),
    });
    expect(mockPrisma.article.findMany).toHaveBeenCalledWith({
      where: { authorId: 'contributor-1' },
      select: expect.objectContaining({ title: true, abstract: true, status: true }),
    });
    expect(mockPrisma.contributionScore.findMany).toHaveBeenCalledWith({
      where: { contributorId: 'contributor-1' },
    });
    expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ actorId: 'contributor-1' }, { entityId: 'contributor-1' }],
      },
    });

    // Should update request to READY with download URL
    expect(mockPrisma.dataExportRequest.update).toHaveBeenCalledWith({
      where: { id: 'export-req-1' },
      data: expect.objectContaining({
        status: 'READY',
        downloadUrl: '/api/v1/contributors/me/data-export/export-req-1/download',
        fileName: 'export-export-req-1.json',
      }),
    });

    // Should log audit event
    expect(mockAuditService.log).toHaveBeenCalledWith({
      actorId: 'contributor-1',
      action: 'data.export.completed',
      entityType: 'DataExportRequest',
      entityId: 'export-req-1',
      correlationId: 'corr-1',
    });
  });

  it('handles empty data gracefully', async () => {
    mockPrisma.contributor.findUnique.mockResolvedValue(null);
    mockPrisma.contribution.findMany.mockResolvedValue([]);
    mockPrisma.evaluation.findMany.mockResolvedValue([]);
    mockPrisma.peerFeedback.findMany.mockResolvedValue([]);
    mockPrisma.article.findMany.mockResolvedValue([]);
    mockPrisma.contributionScore.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.findMany.mockResolvedValue([]);

    await processor.process(createJob());

    expect(mockPrisma.dataExportRequest.update).toHaveBeenCalledWith({
      where: { id: 'export-req-1' },
      data: expect.objectContaining({
        status: 'READY',
      }),
    });
  });

  it('sets status to FAILED on error and records error message', async () => {
    mockPrisma.contributor.findUnique.mockRejectedValue(new Error('Database connection failed'));

    await expect(processor.process(createJob())).rejects.toThrow('Database connection failed');

    expect(mockPrisma.dataExportRequest.update).toHaveBeenCalledWith({
      where: { id: 'export-req-1' },
      data: {
        status: 'FAILED',
        errorMessage: 'Database connection failed',
      },
    });
  });
});

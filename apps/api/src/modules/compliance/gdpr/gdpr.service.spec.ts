import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { GdprService } from './gdpr.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { DomainException } from '../../../common/exceptions/domain.exception.js';
import { AuditService } from '../audit/audit.service.js';

const mockAuditService = { log: vi.fn().mockResolvedValue(undefined) };

const mockPrisma = {
  dataExportRequest: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  dataDeletionRequest: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  contributor: {
    findUnique: vi.fn(),
  },
};

const mockExportQueue = {
  add: vi.fn().mockResolvedValue({ id: 'job-1' }),
};

const mockDeletionQueue = {
  add: vi.fn().mockResolvedValue({ id: 'job-2' }),
};

const mockConfigService = {
  get: vi.fn().mockReturnValue('test-salt'),
};

describe('GdprService', () => {
  let service: GdprService;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        GdprService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
        { provide: getQueueToken('gdpr-export'), useValue: mockExportQueue },
        { provide: getQueueToken('gdpr-deletion'), useValue: mockDeletionQueue },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get(GdprService);
  });

  describe('requestExport', () => {
    it('creates export request and enqueues job', async () => {
      mockPrisma.dataExportRequest.findFirst.mockResolvedValue(null);
      mockPrisma.dataExportRequest.create.mockResolvedValue({
        id: 'export-1',
        contributorId: 'user-1',
        status: 'PENDING',
        requestedAt: new Date('2026-03-10T00:00:00Z'),
        completedAt: null,
        expiresAt: new Date('2026-04-09T00:00:00Z'),
        downloadUrl: null,
        fileName: null,
        correlationId: 'corr-1',
      });

      const result = await service.requestExport('user-1', 'corr-1');

      expect(result.id).toBe('export-1');
      expect(result.status).toBe('PENDING');
      expect(result.contributorId).toBe('user-1');
      expect(mockPrisma.dataExportRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contributorId: 'user-1',
          status: 'PENDING',
          correlationId: 'corr-1',
        }),
      });
      expect(mockExportQueue.add).toHaveBeenCalledWith(
        'process-export',
        expect.objectContaining({
          requestId: 'export-1',
          contributorId: 'user-1',
          correlationId: 'corr-1',
        }),
        expect.any(Object),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'user-1',
          action: 'data.export.requested',
          entityType: 'DataExportRequest',
          entityId: 'export-1',
        }),
      );
    });

    it('rejects duplicate export when PENDING already exists', async () => {
      mockPrisma.dataExportRequest.findFirst.mockResolvedValue({
        id: 'export-existing',
        contributorId: 'user-1',
        status: 'PENDING',
      });

      await expect(service.requestExport('user-1', 'corr-1')).rejects.toThrow(DomainException);
      await expect(service.requestExport('user-1', 'corr-1')).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'DATA_EXPORT_ALREADY_PENDING',
        }),
      });
    });
  });

  describe('getExportStatus', () => {
    it('returns export status', async () => {
      mockPrisma.dataExportRequest.findFirst.mockResolvedValue({
        id: 'export-1',
        contributorId: 'user-1',
        status: 'COMPLETED',
        requestedAt: new Date('2026-03-10T00:00:00Z'),
        completedAt: new Date('2026-03-10T01:00:00Z'),
        expiresAt: new Date('2026-04-09T00:00:00Z'),
        downloadUrl: 'https://storage.example.com/export.zip',
        fileName: 'export-user-1.zip',
      });

      const result = await service.getExportStatus('export-1', 'user-1');

      expect(result.id).toBe('export-1');
      expect(result.status).toBe('COMPLETED');
      expect(result.downloadUrl).toBe('https://storage.example.com/export.zip');
      expect(result.requestedAt).toBe('2026-03-10T00:00:00.000Z');
    });

    it('throws DATA_EXPORT_NOT_FOUND for invalid request', async () => {
      mockPrisma.dataExportRequest.findFirst.mockResolvedValue(null);

      await expect(service.getExportStatus('nonexistent', 'user-1')).rejects.toThrow(
        DomainException,
      );
      await expect(service.getExportStatus('nonexistent', 'user-1')).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'DATA_EXPORT_NOT_FOUND',
        }),
      });
    });
  });

  describe('requestDeletion', () => {
    it('creates deletion request with 30-day cooling off', async () => {
      mockPrisma.dataDeletionRequest.findFirst.mockResolvedValue(null);

      const now = new Date('2026-03-10T00:00:00Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);

      mockPrisma.dataDeletionRequest.create.mockResolvedValue({
        id: 'deletion-1',
        contributorId: 'user-1',
        status: 'PENDING',
        requestedAt: now,
        coolingOffEndsAt: new Date('2026-04-09T00:00:00Z'),
        confirmedAt: null,
        completedAt: null,
        cancelledAt: null,
        pseudonymId: null,
        correlationId: 'corr-1',
      });

      const result = await service.requestDeletion('user-1', 'corr-1');

      expect(result.id).toBe('deletion-1');
      expect(result.status).toBe('PENDING');
      expect(result.daysRemaining).toBe(30);
      expect(mockPrisma.dataDeletionRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          contributorId: 'user-1',
          status: 'PENDING',
          correlationId: 'corr-1',
        }),
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'data.deletion.requested',
          entityType: 'DataDeletionRequest',
          entityId: 'deletion-1',
        }),
      );

      vi.useRealTimers();
    });

    it('rejects duplicate deletion', async () => {
      mockPrisma.dataDeletionRequest.findFirst.mockResolvedValue({
        id: 'deletion-existing',
        contributorId: 'user-1',
        status: 'PENDING',
      });

      await expect(service.requestDeletion('user-1', 'corr-1')).rejects.toThrow(DomainException);
      await expect(service.requestDeletion('user-1', 'corr-1')).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'DATA_DELETION_ALREADY_PENDING',
        }),
      });
    });
  });

  describe('confirmDeletion', () => {
    it('confirms deletion after cooling off expires', async () => {
      const pastCoolingOff = new Date('2026-03-01T00:00:00Z');
      const now = new Date('2026-04-01T00:00:00Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);

      mockPrisma.dataDeletionRequest.findFirst.mockResolvedValue({
        id: 'deletion-1',
        contributorId: 'user-1',
        status: 'PENDING',
        requestedAt: new Date('2026-02-01T00:00:00Z'),
        coolingOffEndsAt: pastCoolingOff,
        confirmedAt: null,
        completedAt: null,
        cancelledAt: null,
        pseudonymId: null,
      });

      mockPrisma.dataDeletionRequest.update.mockResolvedValue({
        id: 'deletion-1',
        contributorId: 'user-1',
        status: 'CONFIRMED',
        requestedAt: new Date('2026-02-01T00:00:00Z'),
        coolingOffEndsAt: pastCoolingOff,
        confirmedAt: now,
        completedAt: null,
        cancelledAt: null,
        pseudonymId: expect.any(String),
      });

      const result = await service.confirmDeletion('deletion-1', 'user-1', 'corr-1');

      expect(result.status).toBe('CONFIRMED');
      expect(mockPrisma.dataDeletionRequest.update).toHaveBeenCalledWith({
        where: { id: 'deletion-1' },
        data: expect.objectContaining({
          status: 'CONFIRMED',
          confirmedAt: now,
        }),
      });
      expect(mockDeletionQueue.add).toHaveBeenCalledWith(
        'process-deletion',
        expect.objectContaining({
          requestId: 'deletion-1',
          contributorId: 'user-1',
        }),
        expect.any(Object),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'data.deletion.confirmed',
          entityType: 'DataDeletionRequest',
          entityId: 'deletion-1',
        }),
      );

      vi.useRealTimers();
    });

    it('rejects confirmation during cooling off (DATA_DELETION_COOLING_OFF_ACTIVE)', async () => {
      const futureCoolingOff = new Date('2026-04-10T00:00:00Z');
      const now = new Date('2026-03-10T00:00:00Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);

      mockPrisma.dataDeletionRequest.findFirst.mockResolvedValue({
        id: 'deletion-1',
        contributorId: 'user-1',
        status: 'PENDING',
        requestedAt: new Date('2026-03-10T00:00:00Z'),
        coolingOffEndsAt: futureCoolingOff,
        confirmedAt: null,
        completedAt: null,
        cancelledAt: null,
        pseudonymId: null,
      });

      await expect(service.confirmDeletion('deletion-1', 'user-1', 'corr-1')).rejects.toThrow(
        DomainException,
      );

      await expect(service.confirmDeletion('deletion-1', 'user-1', 'corr-1')).rejects.toMatchObject(
        {
          response: expect.objectContaining({
            code: 'DATA_DELETION_COOLING_OFF_ACTIVE',
          }),
        },
      );

      vi.useRealTimers();
    });
  });

  describe('cancelDeletion', () => {
    it('cancels deletion request', async () => {
      const now = new Date('2026-03-10T00:00:00Z');
      vi.useFakeTimers();
      vi.setSystemTime(now);

      mockPrisma.dataDeletionRequest.findFirst.mockResolvedValue({
        id: 'deletion-1',
        contributorId: 'user-1',
        status: 'PENDING',
        requestedAt: new Date('2026-03-01T00:00:00Z'),
        coolingOffEndsAt: new Date('2026-03-31T00:00:00Z'),
        confirmedAt: null,
        completedAt: null,
        cancelledAt: null,
        pseudonymId: null,
      });

      mockPrisma.dataDeletionRequest.update.mockResolvedValue({
        id: 'deletion-1',
        contributorId: 'user-1',
        status: 'CANCELLED',
        requestedAt: new Date('2026-03-01T00:00:00Z'),
        coolingOffEndsAt: new Date('2026-03-31T00:00:00Z'),
        confirmedAt: null,
        completedAt: null,
        cancelledAt: now,
        pseudonymId: null,
      });

      const result = await service.cancelDeletion('deletion-1', 'user-1', 'corr-1');

      expect(result.status).toBe('CANCELLED');
      expect(result.cancelledAt).toBe('2026-03-10T00:00:00.000Z');
      expect(mockPrisma.dataDeletionRequest.update).toHaveBeenCalledWith({
        where: { id: 'deletion-1' },
        data: expect.objectContaining({
          status: 'CANCELLED',
          cancelledAt: now,
        }),
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'data.deletion.cancelled',
          entityType: 'DataDeletionRequest',
          entityId: 'deletion-1',
        }),
      );

      vi.useRealTimers();
    });

    it('rejects cancel for non-PENDING status', async () => {
      mockPrisma.dataDeletionRequest.findFirst.mockResolvedValue({
        id: 'deletion-1',
        contributorId: 'user-1',
        status: 'CONFIRMED',
        requestedAt: new Date('2026-03-01T00:00:00Z'),
        coolingOffEndsAt: new Date('2026-03-31T00:00:00Z'),
        confirmedAt: new Date('2026-03-31T00:00:00Z'),
        completedAt: null,
        cancelledAt: null,
        pseudonymId: 'pseudo-1',
      });

      await expect(service.cancelDeletion('deletion-1', 'user-1', 'corr-1')).rejects.toThrow(
        DomainException,
      );

      await expect(service.cancelDeletion('deletion-1', 'user-1', 'corr-1')).rejects.toMatchObject({
        response: expect.objectContaining({
          code: 'DATA_DELETION_ALREADY_COMPLETED',
        }),
      });
    });
  });
});

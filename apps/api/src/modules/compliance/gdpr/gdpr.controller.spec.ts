import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { GdprController } from './gdpr.controller.js';
import { GdprService } from './gdpr.service.js';
import type { CurrentUserPayload } from '../../../common/decorators/current-user.decorator.js';

const mockUser: CurrentUserPayload = {
  id: 'user-1',
  githubId: 12345,
  name: 'Test User',
  email: 'test@example.com',
  avatarUrl: null,
  role: 'CONTRIBUTOR',
};

const mockReq = { correlationId: 'corr-1' } as never;

const mockGdprService = {
  requestExport: vi.fn(),
  getExportStatus: vi.fn(),
  getExportFile: vi.fn(),
  requestDeletion: vi.fn(),
  confirmDeletion: vi.fn(),
  cancelDeletion: vi.fn(),
};

describe('GdprController', () => {
  let controller: GdprController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [GdprController],
      providers: [{ provide: GdprService, useValue: mockGdprService }],
    }).compile();

    controller = module.get(GdprController);
  });

  describe('POST data-export', () => {
    it('calls requestExport with user id and returns success response', async () => {
      const exportDto = {
        id: 'export-1',
        contributorId: 'user-1',
        status: 'PENDING',
        requestedAt: '2026-03-10T00:00:00.000Z',
        completedAt: null,
        expiresAt: '2026-04-09T00:00:00.000Z',
        downloadUrl: null,
        fileName: null,
      };
      mockGdprService.requestExport.mockResolvedValue(exportDto);

      const result = await controller.requestExport(mockUser, mockReq);

      expect(mockGdprService.requestExport).toHaveBeenCalledWith('user-1', 'corr-1');
      expect(result.data).toEqual(exportDto);
      expect(result.meta.correlationId).toBe('corr-1');
    });
  });

  describe('GET data-export/:requestId', () => {
    it('calls getExportStatus with requestId and user id', async () => {
      const exportDto = {
        id: 'export-1',
        contributorId: 'user-1',
        status: 'COMPLETED',
        requestedAt: '2026-03-10T00:00:00.000Z',
        completedAt: '2026-03-10T01:00:00.000Z',
        expiresAt: '2026-04-09T00:00:00.000Z',
        downloadUrl: 'https://storage.example.com/export.zip',
        fileName: 'export.zip',
      };
      mockGdprService.getExportStatus.mockResolvedValue(exportDto);

      const result = await controller.getExportStatus('export-1', mockUser, mockReq);

      expect(mockGdprService.getExportStatus).toHaveBeenCalledWith('export-1', 'user-1');
      expect(result.data).toEqual(exportDto);
    });
  });

  describe('POST data-deletion', () => {
    it('calls requestDeletion with user id', async () => {
      const deletionDto = {
        id: 'deletion-1',
        contributorId: 'user-1',
        status: 'PENDING',
        requestedAt: '2026-03-10T00:00:00.000Z',
        coolingOffEndsAt: '2026-04-09T00:00:00.000Z',
        confirmedAt: null,
        completedAt: null,
        cancelledAt: null,
        pseudonymId: null,
        daysRemaining: 30,
      };
      mockGdprService.requestDeletion.mockResolvedValue(deletionDto);

      const result = await controller.requestDeletion(mockUser, mockReq);

      expect(mockGdprService.requestDeletion).toHaveBeenCalledWith('user-1', 'corr-1');
      expect(result.data).toEqual(deletionDto);
    });
  });

  describe('POST data-deletion/:requestId/confirm', () => {
    it('calls confirmDeletion with requestId and user id', async () => {
      const deletionDto = {
        id: 'deletion-1',
        contributorId: 'user-1',
        status: 'CONFIRMED',
        requestedAt: '2026-03-01T00:00:00.000Z',
        coolingOffEndsAt: '2026-03-31T00:00:00.000Z',
        confirmedAt: '2026-04-01T00:00:00.000Z',
        completedAt: null,
        cancelledAt: null,
        pseudonymId: 'abc123',
        daysRemaining: 0,
      };
      mockGdprService.confirmDeletion.mockResolvedValue(deletionDto);

      const result = await controller.confirmDeletion('deletion-1', mockUser, mockReq);

      expect(mockGdprService.confirmDeletion).toHaveBeenCalledWith(
        'deletion-1',
        'user-1',
        'corr-1',
      );
      expect(result.data).toEqual(deletionDto);
    });
  });

  describe('POST data-deletion/:requestId/cancel', () => {
    it('calls cancelDeletion with requestId and user id', async () => {
      const deletionDto = {
        id: 'deletion-1',
        contributorId: 'user-1',
        status: 'CANCELLED',
        requestedAt: '2026-03-01T00:00:00.000Z',
        coolingOffEndsAt: '2026-03-31T00:00:00.000Z',
        confirmedAt: null,
        completedAt: null,
        cancelledAt: '2026-03-10T00:00:00.000Z',
        pseudonymId: null,
        daysRemaining: 21,
      };
      mockGdprService.cancelDeletion.mockResolvedValue(deletionDto);

      const result = await controller.cancelDeletion('deletion-1', mockUser, mockReq);

      expect(mockGdprService.cancelDeletion).toHaveBeenCalledWith('deletion-1', 'user-1', 'corr-1');
      expect(result.data).toEqual(deletionDto);
    });
  });
});

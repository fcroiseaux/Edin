import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ReportsController', () => {
  let controller: ReportsController;
  let mockReportsService: {
    createReport: ReturnType<typeof vi.fn>;
    listReports: ReturnType<typeof vi.fn>;
    getReport: ReturnType<typeof vi.fn>;
  };

  const mockReq = { correlationId: 'test-correlation-id' };

  beforeEach(async () => {
    mockReportsService = {
      createReport: vi.fn(),
      listReports: vi.fn(),
      getReport: vi.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        { provide: ReportsService, useValue: mockReportsService },
        CaslAbilityFactory,
        Reflector,
        AbilityGuard,
        JwtAuthGuard,
      ],
    }).compile();

    controller = module.get(ReportsController);
  });

  it('should create a report with valid configuration', async () => {
    const body = {
      startDate: '2026-01-01',
      endDate: '2026-03-10',
      kpiIds: ['active-contributor-count'],
      format: 'csv',
    };
    const mockReport = { id: 'job-123', status: 'queued', config: body };
    mockReportsService.createReport.mockResolvedValue(mockReport);

    const result = await controller.createReport(body, 'user-abc', mockReq as any);

    expect(result.data).toEqual(mockReport);
  });

  it('should reject invalid report configuration', async () => {
    const body = { startDate: '2026-01-01', format: 'xml' }; // Missing kpiIds, invalid format

    await expect(controller.createReport(body, 'user-abc', mockReq as any)).rejects.toThrow(
      DomainException,
    );
  });

  it('should list reports with pagination', async () => {
    mockReportsService.listReports.mockResolvedValue({
      items: [{ id: 'job-1', status: 'completed' }],
      hasMore: false,
    });

    const result = await controller.listReports({}, mockReq as any);

    expect(result.data).toHaveLength(1);
    expect(result.meta.pagination).toBeDefined();
  });

  it('should throw NOT_FOUND for missing report download', async () => {
    mockReportsService.getReport.mockResolvedValue(null);

    const mockRes = {
      setHeader: vi.fn(),
      send: vi.fn(),
    };

    await expect(controller.downloadReport('nonexistent', mockRes as any)).rejects.toThrow(
      DomainException,
    );
  });

  it('should throw CONFLICT for not-ready report download', async () => {
    mockReportsService.getReport.mockResolvedValue({
      id: 'job-99',
      status: 'processing',
      config: { format: 'json' },
    });

    const mockRes = {
      setHeader: vi.fn(),
      send: vi.fn(),
    };

    await expect(controller.downloadReport('job-99', mockRes as any)).rejects.toThrow(
      DomainException,
    );
  });
});

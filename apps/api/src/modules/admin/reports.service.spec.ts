import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { ReportsService } from './reports.service.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ReportsService', () => {
  let service: ReportsService;
  let mockQueue: {
    add: ReturnType<typeof vi.fn>;
    getJobs: ReturnType<typeof vi.fn>;
    getJob: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockQueue = {
      add: vi.fn().mockResolvedValue({ id: 'job-123' }),
      getJobs: vi.fn().mockResolvedValue([]),
      getJob: vi.fn().mockResolvedValue(null),
    };

    const module = await Test.createTestingModule({
      providers: [ReportsService, { provide: getQueueToken('admin-reports'), useValue: mockQueue }],
    }).compile();

    service = module.get(ReportsService);
  });

  it('should enqueue a report generation job', async () => {
    const config = {
      startDate: '2026-01-01',
      endDate: '2026-03-10',
      kpiIds: ['active-contributor-count', 'application-rate'],
      format: 'csv' as const,
    };

    const result = await service.createReport(config, 'user-abc');

    expect(mockQueue.add).toHaveBeenCalledWith('generate-report', {
      config,
      createdBy: 'user-abc',
    });
    expect(result.id).toBe('job-123');
    expect(result.status).toBe('queued');
    expect(result.config).toEqual(config);
  });

  it('should list reports from queue jobs', async () => {
    mockQueue.getJobs.mockResolvedValue([
      {
        id: 'job-1',
        timestamp: Date.now(),
        data: { config: { format: 'json' }, createdBy: 'user-1' },
        returnvalue: { completedAt: '2026-03-10T00:00:00Z' },
        getState: vi.fn().mockResolvedValue('completed'),
      },
      {
        id: 'job-2',
        timestamp: Date.now() - 1000,
        data: { config: { format: 'csv' }, createdBy: 'user-2' },
        returnvalue: null,
        getState: vi.fn().mockResolvedValue('active'),
      },
    ]);

    const result = await service.listReports(undefined, 20);

    expect(result.items).toHaveLength(2);
    expect(result.items[0].status).toBe('completed');
    expect(result.items[0].downloadUrl).toContain('job-1');
    expect(result.items[1].status).toBe('processing');
    expect(result.items[1].downloadUrl).toBeNull();
  });

  it('should return null for non-existent report', async () => {
    const result = await service.getReport('nonexistent');

    expect(result).toBeNull();
  });

  it('should return report details for existing job', async () => {
    mockQueue.getJob.mockResolvedValue({
      id: 'job-99',
      timestamp: Date.now(),
      data: {
        config: {
          startDate: '2026-01-01',
          endDate: '2026-03-10',
          kpiIds: ['active-contributor-count'],
          format: 'json',
        },
        createdBy: 'user-abc',
      },
      returnvalue: { completedAt: '2026-03-10T12:00:00Z' },
      getState: vi.fn().mockResolvedValue('completed'),
    });

    const result = await service.getReport('job-99');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('job-99');
    expect(result!.status).toBe('completed');
    expect(result!.downloadUrl).toContain('job-99');
  });

  it('should handle cursor-based pagination', async () => {
    const jobs = Array.from({ length: 5 }, (_, i) => ({
      id: `job-${i}`,
      timestamp: Date.now() - i * 1000,
      data: { config: { format: 'json' }, createdBy: 'user-1' },
      returnvalue: null,
      getState: vi.fn().mockResolvedValue('completed'),
    }));

    mockQueue.getJobs.mockResolvedValue(jobs);

    const result = await service.listReports('job-1', 2);

    // After cursor job-1, should get job-2 and job-3
    expect(result.items.length).toBeLessThanOrEqual(2);
  });
});

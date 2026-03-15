import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { SprintMetricsController } from './sprint-metrics.controller.js';
import { SprintMetricsService } from './sprint-metrics.service.js';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

const mockRequest = { correlationId: 'test-corr-1' } as never;

const mockVelocityData = [
  { x: '2026-02-14', y: 20, label: 'Sprint 9' },
  { x: '2026-02-28', y: 25, label: 'Sprint 10' },
  { x: '2026-03-14', y: 18, label: 'Sprint 11' },
];

const mockBurndownData = [
  { date: '2026-03-01', remainingPoints: 30, idealPoints: 30 },
  { date: '2026-03-02', remainingPoints: 25, idealPoints: 27.5 },
  { date: '2026-03-03', remainingPoints: 20, idealPoints: 25 },
];

const mockSprintList = [
  {
    id: 'metric-1',
    sprintId: 'zh-sprint-1',
    sprintName: 'Sprint 10',
    sprintStart: '2026-03-01T00:00:00.000Z',
    sprintEnd: '2026-03-14T00:00:00.000Z',
    velocity: 25,
    committedPoints: 30,
    deliveredPoints: 25,
  },
];

const mockMetricDetail = {
  id: 'metric-uuid-1',
  sprintId: 'zh-sprint-1',
  sprintName: 'Sprint 10',
  sprintStart: '2026-03-01T00:00:00.000Z',
  sprintEnd: '2026-03-14T00:00:00.000Z',
  velocity: 25,
  committedPoints: 30,
  deliveredPoints: 25,
  cycleTimeAvg: 3.5,
  leadTimeAvg: 5.2,
  scopeChanges: 2,
  estimationAccuracy: 83.5,
};

const mockScopeChanges = [
  {
    id: 'sc-1',
    issueId: 'issue-10',
    issueNumber: 10,
    changeType: 'ADDED' as const,
    storyPoints: 5,
    changedAt: '2026-03-05T10:00:00.000Z',
  },
];

const mockContributorTrends = [
  {
    contributorId: 'contrib-1',
    sprints: [
      {
        sprintId: 'zh-sprint-1',
        sprintName: 'Sprint 10',
        sprintEnd: '2026-03-14',
        plannedPoints: 10,
        deliveredPoints: 8,
        accuracy: 80,
      },
    ],
  },
];

const mockCombinedMetrics = [
  {
    contributorId: 'contrib-1',
    contributorName: 'Alice',
    githubUsername: 'alice',
    sprintCount: 2,
    totalPlannedPoints: 20,
    totalDeliveredPoints: 18,
    averageAccuracy: 90,
    evaluationCount: 5,
    averageEvaluationScore: 75.5,
  },
];

const mockService = {
  getVelocityChartData: vi.fn(),
  getBurndownChartData: vi.fn(),
  listSprints: vi.fn(),
  getSprintMetricById: vi.fn(),
  getScopeChangeHistory: vi.fn(),
  getContributorAccuracyTrends: vi.fn(),
  getCombinedContributorMetrics: vi.fn(),
  generateSprintReportCsv: vi.fn(),
  generateSprintReportPdf: vi.fn(),
};

describe('SprintMetricsController', () => {
  let controller: SprintMetricsController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [SprintMetricsController],
      providers: [
        { provide: SprintMetricsService, useValue: mockService },
        CaslAbilityFactory,
        Reflector,
        AbilityGuard,
        JwtAuthGuard,
      ],
    }).compile();

    controller = module.get(SprintMetricsController);
  });

  describe('GET /sprints/velocity', () => {
    it('returns chart-ready velocity data', async () => {
      mockService.getVelocityChartData.mockResolvedValue(mockVelocityData);

      const result = await controller.getVelocityData(undefined, undefined, mockRequest);

      expect(result.data).toEqual(mockVelocityData);
      expect(result.meta.correlationId).toBe('test-corr-1');
      expect(mockService.getVelocityChartData).toHaveBeenCalledWith({
        domain: undefined,
        limit: 12,
      });
    });

    it('respects domain filter', async () => {
      mockService.getVelocityChartData.mockResolvedValue([]);

      await controller.getVelocityData('Technology', undefined, mockRequest);

      expect(mockService.getVelocityChartData).toHaveBeenCalledWith({
        domain: 'Technology',
        limit: 12,
      });
    });

    it('respects limit parameter', async () => {
      mockService.getVelocityChartData.mockResolvedValue([]);

      await controller.getVelocityData(undefined, '6', mockRequest);

      expect(mockService.getVelocityChartData).toHaveBeenCalledWith({
        domain: undefined,
        limit: 6,
      });
    });

    it('rejects invalid limit', async () => {
      await expect(controller.getVelocityData(undefined, '0', mockRequest)).rejects.toThrow(
        'Invalid query parameters',
      );
    });
  });

  describe('GET /sprints/burndown/:sprintId', () => {
    it('returns burndown data for a sprint', async () => {
      mockService.getSprintMetricById.mockResolvedValue(mockMetricDetail);
      mockService.getBurndownChartData.mockResolvedValue(mockBurndownData);

      const result = await controller.getBurndownData('metric-uuid-1', undefined, mockRequest);

      expect(result.data).toEqual(mockBurndownData);
      expect(mockService.getSprintMetricById).toHaveBeenCalledWith('metric-uuid-1');
      expect(mockService.getBurndownChartData).toHaveBeenCalledWith('zh-sprint-1', undefined);
    });

    it('returns empty array for unknown sprint', async () => {
      mockService.getSprintMetricById.mockResolvedValue(null);

      const result = await controller.getBurndownData('nonexistent', undefined, mockRequest);

      expect(result.data).toEqual([]);
      expect(mockService.getBurndownChartData).not.toHaveBeenCalled();
    });
  });

  describe('GET /sprints', () => {
    it('returns sprint list with pagination', async () => {
      mockService.listSprints.mockResolvedValue({
        data: mockSprintList,
        pagination: { cursor: 'metric-1', hasMore: false },
      });

      const result = await controller.listSprints(undefined, undefined, undefined, mockRequest);

      expect(result.data).toEqual(mockSprintList);
      expect(result.meta.pagination?.hasMore).toBe(false);
      expect(result.meta.pagination?.total).toBe(1);
    });

    it('passes cursor for pagination', async () => {
      mockService.listSprints.mockResolvedValue({
        data: [],
        pagination: { cursor: null, hasMore: false },
      });

      await controller.listSprints(undefined, undefined, 'cursor-123', mockRequest);

      expect(mockService.listSprints).toHaveBeenCalledWith({
        domain: undefined,
        limit: 12,
        cursor: 'cursor-123',
      });
    });
  });

  describe('GET /sprints/:id', () => {
    it('returns sprint metric detail', async () => {
      mockService.getSprintMetricById.mockResolvedValue(mockMetricDetail);

      const result = await controller.getSprintDetail('metric-uuid-1', mockRequest);

      expect(result.data).toEqual(mockMetricDetail);
    });

    it('throws 404 for unknown sprint', async () => {
      mockService.getSprintMetricById.mockResolvedValue(null);

      await expect(controller.getSprintDetail('nonexistent', mockRequest)).rejects.toThrow(
        'not found',
      );
    });
  });

  describe('GET /sprints/:sprintId/scope-changes', () => {
    it('returns scope change history', async () => {
      mockService.getScopeChangeHistory.mockResolvedValue(mockScopeChanges);

      const result = await controller.getScopeChanges(
        'metric-uuid-1',
        undefined,
        undefined,
        mockRequest,
      );

      expect(result.data).toEqual(mockScopeChanges);
      expect(mockService.getScopeChangeHistory).toHaveBeenCalledWith('metric-uuid-1', {
        domain: undefined,
        limit: 50,
      });
    });

    it('respects domain filter', async () => {
      mockService.getScopeChangeHistory.mockResolvedValue([]);

      await controller.getScopeChanges('metric-uuid-1', 'Technology', undefined, mockRequest);

      expect(mockService.getScopeChangeHistory).toHaveBeenCalledWith('metric-uuid-1', {
        domain: 'Technology',
        limit: 50,
      });
    });

    it('rejects invalid limit', async () => {
      await expect(
        controller.getScopeChanges('metric-uuid-1', undefined, '0', mockRequest),
      ).rejects.toThrow('Invalid query parameters');
    });
  });

  describe('GET /sprints/contributors', () => {
    it('returns contributor accuracy trends', async () => {
      mockService.getContributorAccuracyTrends.mockResolvedValue(mockContributorTrends);

      const result = await controller.getContributorTrends(undefined, undefined, mockRequest);

      expect(result.data).toEqual(mockContributorTrends);
      expect(mockService.getContributorAccuracyTrends).toHaveBeenCalledWith({
        domain: undefined,
        limit: 12,
      });
    });

    it('respects domain filter', async () => {
      mockService.getContributorAccuracyTrends.mockResolvedValue([]);

      await controller.getContributorTrends('Technology', undefined, mockRequest);

      expect(mockService.getContributorAccuracyTrends).toHaveBeenCalledWith({
        domain: 'Technology',
        limit: 12,
      });
    });
  });

  describe('GET /sprints/contributors/combined', () => {
    it('returns combined contributor metrics', async () => {
      mockService.getCombinedContributorMetrics.mockResolvedValue(mockCombinedMetrics);

      const result = await controller.getCombinedContributorMetrics(
        undefined,
        undefined,
        mockRequest,
      );

      expect(result.data).toEqual(mockCombinedMetrics);
      expect(mockService.getCombinedContributorMetrics).toHaveBeenCalledWith({
        domain: undefined,
        limit: 12,
      });
    });

    it('respects domain filter', async () => {
      mockService.getCombinedContributorMetrics.mockResolvedValue([]);

      await controller.getCombinedContributorMetrics('Technology', undefined, mockRequest);

      expect(mockService.getCombinedContributorMetrics).toHaveBeenCalledWith({
        domain: 'Technology',
        limit: 12,
      });
    });
  });

  describe('GET /sprints/export', () => {
    it('returns CSV with correct headers', async () => {
      const csvContent = 'Sprint Velocity Report\nSprint,End Date,Velocity';
      mockService.generateSprintReportCsv.mockResolvedValue(csvContent);

      const mockRes = {
        setHeader: vi.fn(),
        send: vi.fn(),
      } as never;

      await controller.exportSprintReport('csv', undefined, undefined, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv; charset=utf-8');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('sprint-report-'),
      );
      expect(mockRes.send).toHaveBeenCalledWith(csvContent);
    });

    it('returns PDF with correct headers', async () => {
      const pdfBuffer = Buffer.from('fake-pdf');
      mockService.generateSprintReportPdf.mockResolvedValue(pdfBuffer);

      const mockRes = {
        setHeader: vi.fn(),
        send: vi.fn(),
      } as never;

      await controller.exportSprintReport('pdf', undefined, undefined, mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockRes.send).toHaveBeenCalledWith(pdfBuffer);
    });

    it('rejects invalid format with 400 response', async () => {
      const mockRes = {
        setHeader: vi.fn(),
        send: vi.fn(),
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as never;

      await controller.exportSprintReport('xml', undefined, undefined, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: expect.any(String),
            message: 'Invalid query parameters',
          }),
        }),
      );
    });
  });
});

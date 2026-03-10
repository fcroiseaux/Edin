import { Test } from '@nestjs/testing';
import { HealthMetricsService } from './health-metrics.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('HealthMetricsService', () => {
  let service: HealthMetricsService;
  let mockPrisma: {
    contributor: {
      count: ReturnType<typeof vi.fn>;
      groupBy: ReturnType<typeof vi.fn>;
    };
    application: { count: ReturnType<typeof vi.fn> };
    contribution: { count: ReturnType<typeof vi.fn> };
    evaluation: {
      groupBy: ReturnType<typeof vi.fn>;
      aggregate: ReturnType<typeof vi.fn>;
    };
    article: {
      count: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    peerFeedback: {
      findMany: ReturnType<typeof vi.fn>;
    };
  };
  let mockRedis: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockPrisma = {
      contributor: {
        count: vi.fn().mockResolvedValue(0),
        groupBy: vi.fn().mockResolvedValue([]),
      },
      application: { count: vi.fn().mockResolvedValue(0) },
      contribution: { count: vi.fn().mockResolvedValue(0) },
      evaluation: {
        groupBy: vi.fn().mockResolvedValue([]),
        aggregate: vi.fn().mockResolvedValue({ _avg: { compositeScore: null } }),
      },
      article: {
        count: vi.fn().mockResolvedValue(0),
        findMany: vi.fn().mockResolvedValue([]),
      },
      peerFeedback: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    mockRedis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        HealthMetricsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get(HealthMetricsService);
  });

  it('should return cached metrics when available', async () => {
    const cachedMetrics = {
      vitals: {},
      leadingKpis: [],
      laggingKpis: [],
      generatedAt: '2026-03-10T00:00:00.000Z',
    };
    mockRedis.get.mockResolvedValue(cachedMetrics);

    const result = await service.getHealthMetrics();

    expect(result).toEqual(cachedMetrics);
    expect(mockPrisma.contributor.count).not.toHaveBeenCalled();
  });

  it('should aggregate from database when cache is empty', async () => {
    mockPrisma.contributor.count.mockResolvedValue(15);
    mockPrisma.contributor.groupBy.mockResolvedValue([
      { domain: 'TECHNOLOGY', _count: 8 },
      { domain: 'FINTECH', _count: 4 },
      { domain: 'IMPACT', _count: 3 },
    ]);

    const result = await service.getHealthMetrics();

    expect(result.vitals.activeContributors.value).toBe(15);
    expect(result.vitals.domainDistribution).toHaveLength(3);
    expect(result.generatedAt).toBeDefined();
    // Should cache the result
    expect(mockRedis.set).toHaveBeenCalledWith('admin:health-metrics', expect.any(Object), 300);
  });

  it('should calculate domain distribution percentages', async () => {
    mockPrisma.contributor.count.mockResolvedValue(10);
    mockPrisma.contributor.groupBy.mockResolvedValue([
      { domain: 'TECHNOLOGY', _count: 5 },
      { domain: 'FINTECH', _count: 3 },
      { domain: 'IMPACT', _count: 2 },
    ]);

    const result = await service.getHealthMetrics();

    expect(result.vitals.domainDistribution[0].percentage).toBe(50);
    expect(result.vitals.domainDistribution[1].percentage).toBe(30);
    expect(result.vitals.domainDistribution[2].percentage).toBe(20);
  });

  it('should calculate retention rate correctly', async () => {
    // First call: active contributors
    // Second call: active contributors 30 days ago
    // Retention data will use two calls: joined (count) and retained (count)
    mockPrisma.contributor.count.mockResolvedValue(10);
    mockPrisma.contributor.groupBy.mockResolvedValue([]);

    const result = await service.getHealthMetrics();

    expect(result.vitals.retentionRate.value).toBeGreaterThanOrEqual(0);
    expect(result.vitals.retentionRate.unit).toBe('%');
    expect(result.vitals.retentionRate.target).toBe(50);
  });

  it('should calculate feedback turnaround in hours', async () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

    mockPrisma.peerFeedback.findMany.mockResolvedValue([
      { assignedAt: fourHoursAgo, submittedAt: twoHoursAgo },
      { assignedAt: fourHoursAgo, submittedAt: now },
    ]);
    mockPrisma.contributor.count.mockResolvedValue(5);
    mockPrisma.contributor.groupBy.mockResolvedValue([]);

    const result = await service.getHealthMetrics();

    // Average: (2 + 4) / 2 = 3 hours
    expect(result.vitals.feedbackTurnaroundHours.value).toBe(3);
  });

  it('should handle zero contributors gracefully', async () => {
    mockPrisma.contributor.count.mockResolvedValue(0);
    mockPrisma.contributor.groupBy.mockResolvedValue([]);

    const result = await service.getHealthMetrics();

    expect(result.vitals.activeContributors.value).toBe(0);
    expect(result.vitals.contributionFrequency.value).toBe(0);
    expect(result.vitals.retentionRate.value).toBe(0);
  });

  it('should build leading KPIs from definitions', async () => {
    mockPrisma.contributor.count.mockResolvedValue(5);
    mockPrisma.contributor.groupBy.mockResolvedValue([]);
    mockPrisma.application.count.mockResolvedValue(3);
    mockPrisma.article.count.mockResolvedValue(2);

    const result = await service.getHealthMetrics();

    expect(result.leadingKpis.length).toBeGreaterThan(0);
    expect(result.leadingKpis.every((k) => k.category === 'leading')).toBe(true);
    const appRate = result.leadingKpis.find((k) => k.id === 'application-rate');
    expect(appRate).toBeDefined();
    expect(appRate!.value).toBe(3);
  });

  it('should build lagging KPIs from definitions', async () => {
    mockPrisma.contributor.count.mockResolvedValue(25);
    mockPrisma.contributor.groupBy.mockResolvedValue([]);
    mockPrisma.evaluation.aggregate.mockResolvedValue({ _avg: { compositeScore: 72.5 } });

    const result = await service.getHealthMetrics();

    expect(result.laggingKpis.length).toBeGreaterThan(0);
    expect(result.laggingKpis.every((k) => k.category === 'lagging')).toBe(true);
    const activeCount = result.laggingKpis.find((k) => k.id === 'active-contributor-count');
    expect(activeCount).toBeDefined();
    expect(activeCount!.value).toBe(25);
  });

  it('should generate editorial context for on-track metrics', async () => {
    mockPrisma.contributor.count.mockResolvedValue(18);
    mockPrisma.contributor.groupBy.mockResolvedValue([]);

    const result = await service.getHealthMetrics();

    // 18 out of 20 target = 90% = on track
    expect(result.vitals.activeContributors.editorialContext).toContain('on track');
  });

  it('should generate editorial context for below-target metrics', async () => {
    mockPrisma.contributor.count.mockResolvedValue(5);
    mockPrisma.contributor.groupBy.mockResolvedValue([]);

    const result = await service.getHealthMetrics();

    // 5 out of 20 target = 25% = needs attention
    expect(result.vitals.activeContributors.editorialContext).toContain('needs attention');
  });

  it('should generate editorial context for exceeding-target metrics', async () => {
    mockPrisma.contributor.count.mockResolvedValue(30);
    mockPrisma.contributor.groupBy.mockResolvedValue([]);

    const result = await service.getHealthMetrics();

    // 30 out of 20 target = 150% = exceeds
    expect(result.vitals.activeContributors.editorialContext).toContain('exceeds target');
  });

  it('should include evaluation completion rate', async () => {
    mockPrisma.contributor.count.mockResolvedValue(5);
    mockPrisma.contributor.groupBy.mockResolvedValue([]);
    mockPrisma.evaluation.groupBy.mockResolvedValue([
      { status: 'COMPLETED', _count: 80 },
      { status: 'FAILED', _count: 10 },
      { status: 'PENDING', _count: 10 },
    ]);

    const result = await service.getHealthMetrics();

    expect(result.vitals.evaluationCompletionRate.value).toBe(80);
    expect(result.vitals.evaluationCompletionRate.unit).toBe('%');
  });
});

import { Test } from '@nestjs/testing';
import { AlertsService } from './alerts.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../common/redis/redis.service.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('AlertsService', () => {
  let service: AlertsService;
  let mockPrisma: {
    evaluation: { count: ReturnType<typeof vi.fn> };
    webhookDelivery: { count: ReturnType<typeof vi.fn> };
  };
  let mockRedis: {
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockPrisma = {
      evaluation: { count: vi.fn().mockResolvedValue(0) },
      webhookDelivery: { count: vi.fn().mockResolvedValue(0) },
    };

    mockRedis = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
    };

    const module = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get(AlertsService);
  });

  it('should return empty alerts when no thresholds breached', async () => {
    // All counts = 0 means no error rate issues
    const alerts = await service.getActiveAlerts();

    // No evaluations means no error rate to report
    expect(alerts.filter((a) => !a.dismissed)).toHaveLength(0);
  });

  it('should detect API error rate threshold breach', async () => {
    // 10 total evaluations in last hour, 3 failed = 30% error rate
    mockPrisma.evaluation.count
      .mockResolvedValueOnce(10) // total evals in last hour
      .mockResolvedValueOnce(3) // failed evals
      .mockResolvedValueOnce(5) // completed in last hour
      .mockResolvedValueOnce(50) // completed in prev 23h
      .mockResolvedValue(0);

    const alerts = await service.getActiveAlerts();
    const apiAlert = alerts.find((a) => a.type === 'API_ERROR_RATE');

    expect(apiAlert).toBeDefined();
    expect(apiAlert!.severity).toBe('CRITICAL'); // 30% > 5% critical threshold
    expect(apiAlert!.currentValue).toBe(30);
  });

  it('should detect ingestion pipeline failures', async () => {
    mockPrisma.webhookDelivery.count.mockResolvedValue(5);

    const alerts = await service.getActiveAlerts();
    const ingestionAlert = alerts.find((a) => a.type === 'INGESTION_FAILURE');

    expect(ingestionAlert).toBeDefined();
    expect(ingestionAlert!.severity).toBe('WARNING'); // 5 >= 3 warning threshold, < 10 critical
    expect(ingestionAlert!.currentValue).toBe(5);
  });

  it('should dismiss an alert and store in Redis', async () => {
    const result = await service.dismissAlert('test-alert-123');

    expect(result).toBe(true);
    expect(mockRedis.set).toHaveBeenCalledWith(
      'admin:alert:dismissed:test-alert-123',
      { dismissed: true },
      86400,
    );
  });

  it('should mark alerts as dismissed when Redis has dismiss record', async () => {
    // 10 total evaluations, 5 failed = 50% error rate
    mockPrisma.evaluation.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(5)
      .mockResolvedValue(0);

    // The alert dismiss key will be checked
    mockRedis.get.mockResolvedValue({ dismissed: true });

    const alerts = await service.getActiveAlerts();
    const apiAlert = alerts.find((a) => a.type === 'API_ERROR_RATE');

    expect(apiAlert).toBeDefined();
    expect(apiAlert!.dismissed).toBe(true);
  });

  it('should not generate false positives when no evaluations exist', async () => {
    // Zero evaluations in the hour — no error rate alert
    mockPrisma.evaluation.count.mockResolvedValue(0);

    const alerts = await service.getActiveAlerts();

    const apiAlert = alerts.find((a) => a.type === 'API_ERROR_RATE');
    expect(apiAlert).toBeUndefined();
  });
});

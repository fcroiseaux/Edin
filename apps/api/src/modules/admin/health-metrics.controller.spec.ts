import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { HealthMetricsController } from './health-metrics.controller.js';
import { HealthMetricsService } from './health-metrics.service.js';
import { AlertsService } from './alerts.service.js';
import { CaslAbilityFactory } from '../auth/casl/ability.factory.js';
import { AbilityGuard } from '../../common/guards/ability.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('HealthMetricsController', () => {
  let controller: HealthMetricsController;
  let mockHealthMetricsService: {
    getHealthMetrics: ReturnType<typeof vi.fn>;
  };
  let mockAlertsService: {
    getActiveAlerts: ReturnType<typeof vi.fn>;
    dismissAlert: ReturnType<typeof vi.fn>;
  };

  const mockReq = { correlationId: 'test-correlation-id' };

  beforeEach(async () => {
    mockHealthMetricsService = {
      getHealthMetrics: vi.fn(),
    };

    mockAlertsService = {
      getActiveAlerts: vi.fn(),
      dismissAlert: vi.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [HealthMetricsController],
      providers: [
        { provide: HealthMetricsService, useValue: mockHealthMetricsService },
        { provide: AlertsService, useValue: mockAlertsService },
        CaslAbilityFactory,
        Reflector,
        AbilityGuard,
        JwtAuthGuard,
      ],
    }).compile();

    controller = module.get(HealthMetricsController);
  });

  it('should return health metrics in success response', async () => {
    const mockMetrics = {
      vitals: { activeContributors: { value: 10 } },
      leadingKpis: [],
      laggingKpis: [],
      generatedAt: '2026-03-10T00:00:00.000Z',
    };
    mockHealthMetricsService.getHealthMetrics.mockResolvedValue(mockMetrics);

    const result = await controller.getHealthMetrics(mockReq as any);

    expect(result.data).toEqual(mockMetrics);
    expect(result.meta.correlationId).toBe('test-correlation-id');
  });

  it('should return active alerts', async () => {
    const mockAlerts = [{ id: 'abc123', type: 'API_ERROR_RATE', severity: 'WARNING' }];
    mockAlertsService.getActiveAlerts.mockResolvedValue(mockAlerts);

    const result = await controller.getAlerts(mockReq as any);

    expect(result.data).toEqual(mockAlerts);
  });

  it('should dismiss an alert and return success', async () => {
    mockAlertsService.dismissAlert.mockResolvedValue(true);

    const result = await controller.dismissAlert('abc123', mockReq as any);

    expect(result.data.dismissed).toBe(true);
  });

  it('should throw NOT_FOUND when dismissing non-existent alert', async () => {
    mockAlertsService.dismissAlert.mockResolvedValue(false);

    await expect(controller.dismissAlert('nonexistent', mockReq as any)).rejects.toThrow(
      DomainException,
    );
  });

  it('should handle missing correlation ID gracefully', async () => {
    mockHealthMetricsService.getHealthMetrics.mockResolvedValue({
      vitals: {},
      leadingKpis: [],
      laggingKpis: [],
      generatedAt: '2026-03-10T00:00:00.000Z',
    });

    const result = await controller.getHealthMetrics({} as any);

    expect(result.meta.correlationId).toBe('');
  });
});

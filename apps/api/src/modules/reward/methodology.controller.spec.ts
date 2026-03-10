import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { MethodologyController } from './methodology.controller.js';
import { MethodologyService } from './methodology.service.js';
import { ThrottlerModule } from '@nestjs/throttler';
import type { CalculatorResult } from '@edin/shared';

describe('MethodologyController', () => {
  let controller: MethodologyController;
  let service: MethodologyService;

  const mockResult: CalculatorResult = {
    projectedPoints: [
      {
        month: 1,
        rawScore: 7,
        compoundingMultiplier: 1.0,
        compoundedScore: 7,
        cumulativeRewardUnits: 7,
      },
    ],
    summary: {
      totalContributions: 5,
      finalMultiplier: 1.0,
      totalRewardUnits: 7,
      compoundingEffect: '1x more than linear',
    },
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 10 }] })],
      controllers: [MethodologyController],
      providers: [
        {
          provide: MethodologyService,
          useValue: { calculate: vi.fn().mockReturnValue(mockResult) },
        },
      ],
    }).compile();

    controller = module.get(MethodologyController);
    service = module.get(MethodologyService);
  });

  it('should return calculator result for valid input', () => {
    const req = { correlationId: 'test-corr-id' } as any;
    const body = { monthlyContributions: 5, avgQualityScore: 70, months: 1 };

    const response = controller.calculate(body, req);

    expect(service.calculate).toHaveBeenCalledWith({
      monthlyContributions: 5,
      avgQualityScore: 70,
      months: 1,
    });
    expect(response).toEqual({
      data: mockResult,
      meta: expect.objectContaining({ correlationId: 'test-corr-id' }),
    });
  });

  it('should accept optional domain parameter', () => {
    const req = { correlationId: 'test-corr-id' } as any;
    const body = {
      monthlyContributions: 5,
      avgQualityScore: 70,
      months: 1,
      domain: 'technology',
    };

    controller.calculate(body, req);

    expect(service.calculate).toHaveBeenCalledWith({
      monthlyContributions: 5,
      avgQualityScore: 70,
      months: 1,
      domain: 'technology',
    });
  });

  it('should reject invalid monthlyContributions', () => {
    const req = { correlationId: 'test-corr-id' } as any;
    const body = { monthlyContributions: 0, avgQualityScore: 70, months: 1 };

    expect(() => controller.calculate(body, req)).toThrow();
  });

  it('should reject invalid avgQualityScore', () => {
    const req = { correlationId: 'test-corr-id' } as any;
    const body = { monthlyContributions: 5, avgQualityScore: 101, months: 1 };

    expect(() => controller.calculate(body, req)).toThrow();
  });

  it('should reject invalid months', () => {
    const req = { correlationId: 'test-corr-id' } as any;
    const body = { monthlyContributions: 5, avgQualityScore: 70, months: 37 };

    expect(() => controller.calculate(body, req)).toThrow();
  });

  it('should reject invalid domain', () => {
    const req = { correlationId: 'test-corr-id' } as any;
    const body = {
      monthlyContributions: 5,
      avgQualityScore: 70,
      months: 1,
      domain: 'invalid',
    };

    expect(() => controller.calculate(body, req)).toThrow();
  });
});

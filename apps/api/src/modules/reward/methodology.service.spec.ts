import { describe, it, expect, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { MethodologyService } from './methodology.service.js';

describe('MethodologyService', () => {
  let service: MethodologyService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [MethodologyService],
    }).compile();

    service = module.get(MethodologyService);
  });

  describe('calculate', () => {
    it('should return projected points for each month', () => {
      const result = service.calculate({
        monthlyContributions: 5,
        avgQualityScore: 70,
        months: 3,
      });

      expect(result.projectedPoints).toHaveLength(3);
      expect(result.projectedPoints[0].month).toBe(1);
      expect(result.projectedPoints[1].month).toBe(2);
      expect(result.projectedPoints[2].month).toBe(3);
    });

    it('should compute rawScore as quality * contributions / 50', () => {
      const result = service.calculate({
        monthlyContributions: 25,
        avgQualityScore: 80,
        months: 1,
      });

      // rawScore = 80 * 25 / 50 = 40
      expect(result.projectedPoints[0].rawScore).toBe(40);
    });

    it('should cap monthlyContributions at 50 for rawScore calculation', () => {
      const result = service.calculate({
        monthlyContributions: 50,
        avgQualityScore: 100,
        months: 1,
      });

      // rawScore = 100 * 50 / 50 = 100
      expect(result.projectedPoints[0].rawScore).toBe(100);
    });

    it('should apply compounding multiplier from scaling curve at exact points', () => {
      // At month 1, multiplier = 1.0
      const result = service.calculate({
        monthlyContributions: 50,
        avgQualityScore: 100,
        months: 1,
      });

      expect(result.projectedPoints[0].compoundingMultiplier).toBe(1);
      expect(result.projectedPoints[0].compoundedScore).toBe(100);
    });

    it('should interpolate multiplier between scaling curve points', () => {
      // At month 2, between 1 (1.0x) and 3 (1.8x): ratio = 0.5, multiplier = 1.4
      const result = service.calculate({
        monthlyContributions: 50,
        avgQualityScore: 100,
        months: 2,
      });

      expect(result.projectedPoints[1].compoundingMultiplier).toBe(1.4);
    });

    it('should accumulate cumulative reward units across months', () => {
      const result = service.calculate({
        monthlyContributions: 50,
        avgQualityScore: 100,
        months: 3,
      });

      // Month 1: rawScore=100, mult=1.0, compounded=100, cumulative=100
      // Month 2: rawScore=100, mult=1.4, compounded=140, cumulative=240
      // Month 3: rawScore=100, mult=1.8, compounded=180, cumulative=420
      expect(result.projectedPoints[0].cumulativeRewardUnits).toBe(100);
      expect(result.projectedPoints[1].cumulativeRewardUnits).toBe(240);
      expect(result.projectedPoints[2].cumulativeRewardUnits).toBe(420);
    });

    it('should compute summary with correct totalContributions', () => {
      const result = service.calculate({
        monthlyContributions: 10,
        avgQualityScore: 70,
        months: 6,
      });

      expect(result.summary.totalContributions).toBe(60);
    });

    it('should compute summary finalMultiplier from last point', () => {
      const result = service.calculate({
        monthlyContributions: 5,
        avgQualityScore: 70,
        months: 12,
      });

      // At month 12, multiplier = 6.5 (exact scaling curve point)
      expect(result.summary.finalMultiplier).toBe(6.5);
    });

    it('should compute compounding effect as ratio vs linear', () => {
      const result = service.calculate({
        monthlyContributions: 50,
        avgQualityScore: 100,
        months: 3,
      });

      // Linear total = 100 * 3 = 300
      // Actual total = 100 + 140 + 180 = 420
      // Ratio = 420 / 300 = 1.4
      expect(result.summary.compoundingEffect).toBe('1.4x more than linear');
    });

    it('should handle zero quality score', () => {
      const result = service.calculate({
        monthlyContributions: 10,
        avgQualityScore: 0,
        months: 3,
      });

      expect(result.projectedPoints.every((p) => p.rawScore === 0)).toBe(true);
      expect(result.summary.totalRewardUnits).toBe(0);
    });

    it('should handle single month duration', () => {
      const result = service.calculate({
        monthlyContributions: 5,
        avgQualityScore: 50,
        months: 1,
      });

      expect(result.projectedPoints).toHaveLength(1);
      expect(result.summary.compoundingEffect).toBe('1x more than linear');
    });

    it('should handle maximum duration (36 months)', () => {
      const result = service.calculate({
        monthlyContributions: 5,
        avgQualityScore: 70,
        months: 36,
      });

      expect(result.projectedPoints).toHaveLength(36);
      // After 24 months, multiplier caps at 14.0
      expect(result.projectedPoints[35].compoundingMultiplier).toBe(14);
    });
  });

  describe('interpolateMultiplier', () => {
    it('should return 1.0 for month 0 or negative', () => {
      expect(service.interpolateMultiplier(0)).toBe(1.0);
      expect(service.interpolateMultiplier(-1)).toBe(1.0);
    });

    it('should return exact values at scaling curve points', () => {
      expect(service.interpolateMultiplier(1)).toBe(1.0);
      expect(service.interpolateMultiplier(3)).toBe(1.8);
      expect(service.interpolateMultiplier(6)).toBe(3.2);
      expect(service.interpolateMultiplier(12)).toBe(6.5);
      expect(service.interpolateMultiplier(24)).toBe(14.0);
    });

    it('should interpolate linearly between points', () => {
      // Between 6 (3.2) and 12 (6.5): at month 9, ratio = 0.5
      // 3.2 + 0.5 * (6.5 - 3.2) = 3.2 + 1.65 = 4.85
      expect(service.interpolateMultiplier(9)).toBe(4.85);
    });

    it('should cap at max multiplier for months beyond curve', () => {
      expect(service.interpolateMultiplier(30)).toBe(14.0);
      expect(service.interpolateMultiplier(100)).toBe(14.0);
    });
  });
});

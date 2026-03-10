import { Controller, Post, Body, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { createSuccessResponse } from '../../common/types/api-response.type.js';
import { DomainException } from '../../common/exceptions/domain.exception.js';
import { MethodologyService } from './methodology.service.js';
import { ERROR_CODES } from '@edin/shared';
import type { CalculatorInput } from '@edin/shared';
import type { Request } from 'express';

const VALID_DOMAINS = new Set(['technology', 'fintech', 'impact', 'governance']);

@Controller({ path: 'rewards/methodology', version: '1' })
export class MethodologyController {
  constructor(private readonly methodologyService: MethodologyService) {}

  /**
   * POST /api/v1/rewards/methodology/calculate — public calculator endpoint.
   * No authentication required.
   */
  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  calculate(
    @Body() body: Record<string, unknown>,
    @Req() req: Request & { correlationId?: string },
  ) {
    const input = this.validateInput(body);
    const result = this.methodologyService.calculate(input);
    return createSuccessResponse(result, req.correlationId ?? '');
  }

  private validateInput(body: Record<string, unknown>): CalculatorInput {
    const errors: Array<{ field: string; message: string }> = [];

    const monthlyContributions = Number(body.monthlyContributions);
    if (
      !Number.isFinite(monthlyContributions) ||
      !Number.isInteger(monthlyContributions) ||
      monthlyContributions < 1 ||
      monthlyContributions > 50
    ) {
      errors.push({
        field: 'monthlyContributions',
        message: 'Must be an integer between 1 and 50',
      });
    }

    const avgQualityScore = Number(body.avgQualityScore);
    if (!Number.isFinite(avgQualityScore) || avgQualityScore < 0 || avgQualityScore > 100) {
      errors.push({
        field: 'avgQualityScore',
        message: 'Must be a number between 0 and 100',
      });
    }

    const months = Number(body.months);
    if (!Number.isFinite(months) || months < 1 || months > 36 || !Number.isInteger(months)) {
      errors.push({
        field: 'months',
        message: 'Must be an integer between 1 and 36',
      });
    }

    const domain = body.domain as string | undefined;
    if (domain !== undefined && !VALID_DOMAINS.has(domain)) {
      errors.push({
        field: 'domain',
        message: 'Must be one of: technology, fintech, impact, governance',
      });
    }

    if (errors.length > 0) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid calculator input',
        HttpStatus.BAD_REQUEST,
        errors,
      );
    }

    return {
      monthlyContributions,
      avgQualityScore,
      months,
      ...(domain && { domain }),
    };
  }
}

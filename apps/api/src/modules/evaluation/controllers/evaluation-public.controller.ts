import { Controller, Get, Param, Logger, Res } from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'crypto';
import { createSuccessResponse } from '../../../common/types/api-response.type.js';
import { EvaluationService } from '../evaluation.service.js';

@Controller({ path: 'public/evaluations', version: '1' })
export class EvaluationPublicController {
  private readonly logger = new Logger(EvaluationPublicController.name);

  constructor(private readonly evaluationService: EvaluationService) {}

  @Get('aggregate')
  async getPublicAggregate(@Res({ passthrough: true }) res: Response) {
    const correlationId = randomUUID();

    const aggregate = await this.evaluationService.getPublicEvaluationAggregate();

    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');

    this.logger.log('Public evaluation aggregate served', {
      module: 'evaluation',
      totalEvaluations: aggregate.totalEvaluations,
      correlationId,
    });

    return createSuccessResponse(aggregate, correlationId);
  }

  @Get('contributor/:id')
  async getContributorPublicScores(@Param('id') id: string) {
    const correlationId = randomUUID();

    const scores = await this.evaluationService.getContributorPublicScores(id);

    this.logger.debug('Public contributor scores served', {
      module: 'evaluation',
      contributorId: id,
      hasScores: scores !== null,
      correlationId,
    });

    return createSuccessResponse(scores, correlationId);
  }
}

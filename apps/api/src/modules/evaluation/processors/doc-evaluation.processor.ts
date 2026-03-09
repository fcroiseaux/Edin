import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { RedisService } from '../../../common/redis/redis.service.js';
import { EvaluationModelRegistry } from '../models/evaluation-model.registry.js';
import { EvaluationRubricService } from '../services/evaluation-rubric.service.js';
import {
  EVALUATION_PROVIDER,
  type EvaluationProvider,
  type DocEvaluationInput,
} from '../providers/evaluation-provider.interface.js';
import {
  DEFAULT_DOC_WEIGHTS,
  DOC_FORMULA_VERSION,
  EVALUATION_CACHE_TTL,
  MAX_DOC_CONTENT_LENGTH,
} from '@edin/shared';
import type { DocEvaluationDimensionKey, EvaluationCompletedEvent } from '@edin/shared';

export interface DocEvaluationJobData {
  evaluationId: string;
  contributionId: string;
  contributionType: string;
  contributorId: string;
  correlationId: string;
}

@Processor('doc-evaluation')
export class DocEvaluationProcessor extends WorkerHost {
  private readonly logger = new Logger(DocEvaluationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly modelRegistry: EvaluationModelRegistry,
    private readonly rubricService: EvaluationRubricService,
    @Inject(EVALUATION_PROVIDER)
    private readonly evaluationProvider: EvaluationProvider,
    private readonly eventEmitter: EventEmitter2,
  ) {
    super();
  }

  async process(job: Job<DocEvaluationJobData>): Promise<void> {
    const { evaluationId, contributionId, contributorId, correlationId } = job.data;

    this.logger.log('Starting documentation evaluation', {
      module: 'evaluation',
      jobId: job.id,
      evaluationId,
      contributionId,
      correlationId,
    });

    try {
      const contribution = await this.prisma.contribution.findUniqueOrThrow({
        where: { id: contributionId },
        include: {
          repository: { select: { fullName: true } },
          contributor: { select: { domain: true } },
        },
      });

      const model = await this.modelRegistry.getActiveModel('documentation');

      const rawData = contribution.rawData as Record<string, unknown>;
      const documentType = (rawData?.documentType as string) ?? undefined;

      const rubric = await this.rubricService.getActiveRubric('DOCUMENTATION', documentType);

      const input = this.buildEvaluationInput(contribution, rubric?.parameters);

      this.logger.log('Calling evaluation provider for documentation', {
        module: 'evaluation',
        evaluationId,
        contributionId,
        documentType: input.documentType,
        correlationId,
      });

      const result = await this.evaluationProvider.evaluateDocumentation(input);

      const taskComplexityMultiplier = this.computeComplexityMultiplier(
        input.documentContent.length,
      );
      const domainNormalizationFactor = 1.0;

      const compositeScore = this.computeCompositeScore(
        result.dimensions,
        taskComplexityMultiplier,
        domainNormalizationFactor,
      );

      this.logger.log('Doc composite score computed', {
        module: 'evaluation',
        evaluationId,
        compositeScore,
        taskComplexityMultiplier,
        correlationId,
      });

      await this.prisma.$transaction(async (tx) => {
        await tx.evaluation.update({
          where: { id: evaluationId },
          data: {
            status: 'COMPLETED',
            compositeScore,
            dimensionScores: result.dimensions,
            narrative: result.narrative,
            formulaVersion: DOC_FORMULA_VERSION,
            modelId: model.id,
            rubricId: rubric?.id ?? null,
            rawInputs: {
              formulaVersion: DOC_FORMULA_VERSION,
              weights: DEFAULT_DOC_WEIGHTS,
              taskComplexityMultiplier,
              domainNormalizationFactor,
              modelPromptVersion:
                (model.config as Record<string, unknown>)?.promptVersion ?? 'unknown',
              rubricId: rubric?.id ?? null,
              rubricVersion: rubric?.version ?? null,
            },
            metadata: {
              rawModelOutput: result.rawModelOutput,
            },
            completedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: null,
            action: 'EVALUATION_COMPLETED',
            entityType: 'Evaluation',
            entityId: evaluationId,
            correlationId,
            details: {
              contributionId,
              contributorId,
              compositeScore,
              modelId: model.id,
              formulaVersion: DOC_FORMULA_VERSION,
              evaluationType: 'DOCUMENTATION',
            },
          },
        });
      });

      await this.redisService.set(
        `evaluation:${contributionId}`,
        {
          evaluationId,
          status: 'COMPLETED',
          compositeScore,
          dimensionScores: result.dimensions,
          contributorId,
        },
        EVALUATION_CACHE_TTL,
      );

      const domain = contribution.contributor?.domain ?? null;

      const event: EvaluationCompletedEvent = {
        eventType: 'evaluation.score.completed',
        timestamp: new Date().toISOString(),
        correlationId,
        actorId: contributorId,
        payload: {
          evaluationId,
          contributionId,
          contributorId,
          contributionTitle: contribution.title,
          contributionType: contribution.contributionType,
          compositeScore,
          domain,
        },
      };

      this.eventEmitter.emit('evaluation.score.completed', event);

      this.logger.log('Documentation evaluation completed', {
        module: 'evaluation',
        evaluationId,
        contributionId,
        compositeScore,
        correlationId,
      });
    } catch (error) {
      this.logger.error('Documentation evaluation failed', {
        module: 'evaluation',
        evaluationId,
        contributionId,
        correlationId,
        error: error instanceof Error ? error.message : String(error),
      });

      await this.prisma.evaluation
        .update({
          where: { id: evaluationId },
          data: { status: 'FAILED' },
        })
        .catch(() => {
          /* best effort */
        });

      throw error;
    }
  }

  private buildEvaluationInput(
    contribution: {
      id: string;
      contributionType: string;
      title: string;
      description: string | null;
      rawData: unknown;
      sourceRef: string;
      repository: { fullName: string };
    },
    rubricParameters?: Record<string, unknown> | null,
  ): DocEvaluationInput {
    const rawData = contribution.rawData as Record<string, unknown>;

    let documentContent = '';
    const rawFiles = (rawData?.files as Array<Record<string, unknown>>) ?? [];

    for (const file of rawFiles) {
      const patch = (file.patch as string) ?? '';
      if (patch) {
        documentContent += patch + '\n';
      }
    }

    if (!documentContent && rawData?.content) {
      documentContent = rawData.content as string;
    }

    if (documentContent.length > MAX_DOC_CONTENT_LENGTH) {
      documentContent = documentContent.slice(0, MAX_DOC_CONTENT_LENGTH) + '\n... [truncated]';
    }

    const documentType = (rawData?.documentType as string) ?? undefined;

    return {
      contributionId: contribution.id,
      contributionType: contribution.contributionType,
      repositoryName: contribution.repository.fullName,
      documentTitle: contribution.title,
      documentContent,
      documentType,
      rubricParameters: rubricParameters as DocEvaluationInput['rubricParameters'],
    };
  }

  private computeComplexityMultiplier(contentLength: number): number {
    if (contentLength < 1000) return 1.0;
    if (contentLength < 5000) return 1.05;
    if (contentLength < 20000) return 1.1;
    return 1.15;
  }

  private computeCompositeScore(
    dimensions: Record<DocEvaluationDimensionKey, { score: number }>,
    taskComplexityMultiplier: number,
    domainNormalizationFactor: number,
  ): number {
    const weightedSum = (
      Object.entries(DEFAULT_DOC_WEIGHTS) as [DocEvaluationDimensionKey, number][]
    ).reduce((sum, [key, weight]) => sum + dimensions[key].score * weight, 0);
    return Math.min(
      100,
      Math.round(weightedSum * taskComplexityMultiplier * domainNormalizationFactor),
    );
  }
}

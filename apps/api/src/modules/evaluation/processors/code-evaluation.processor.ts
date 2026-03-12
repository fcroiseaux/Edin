import { Inject, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { RedisService } from '../../../common/redis/redis.service.js';
import { AuditService } from '../../compliance/audit/audit.service.js';
import { EvaluationModelRegistry } from '../models/evaluation-model.registry.js';
import {
  EVALUATION_PROVIDER,
  type EvaluationProvider,
  type CodeEvaluationInput,
} from '../providers/evaluation-provider.interface.js';
import {
  DEFAULT_CODE_WEIGHTS,
  FORMULA_VERSION,
  EVALUATION_CACHE_TTL,
  MAX_PATCH_LENGTH,
  MAX_EVALUATION_FILES,
} from '@edin/shared';
import type { EvaluationDimensionKey, EvaluationCompletedEvent } from '@edin/shared';

export interface CodeEvaluationJobData {
  evaluationId: string;
  contributionId: string;
  contributionType: string;
  contributorId: string;
  correlationId: string;
}

@Processor('code-evaluation')
export class CodeEvaluationProcessor extends WorkerHost {
  private readonly logger = new Logger(CodeEvaluationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly modelRegistry: EvaluationModelRegistry,
    @Inject(EVALUATION_PROVIDER)
    private readonly evaluationProvider: EvaluationProvider,
    private readonly eventEmitter: EventEmitter2,
    private readonly auditService: AuditService,
  ) {
    super();
  }

  async process(job: Job<CodeEvaluationJobData>): Promise<void> {
    const { evaluationId, contributionId, contributorId, correlationId } = job.data;

    this.logger.log('Starting code evaluation', {
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

      const model = await this.modelRegistry.getActiveModel('code');

      const input = this.buildEvaluationInput(contribution);
      input.modelId = model.apiModelId;

      this.logger.log('Calling evaluation provider', {
        module: 'evaluation',
        evaluationId,
        contributionId,
        fileCount: input.files.length,
        correlationId,
      });

      const result = await this.evaluationProvider.evaluateCode(input);

      const taskComplexityMultiplier = this.computeComplexityMultiplier(input.files);
      const domainNormalizationFactor = 1.0;

      const compositeScore = this.computeCompositeScore(
        result.dimensions,
        taskComplexityMultiplier,
        domainNormalizationFactor,
      );

      this.logger.log('Composite score computed', {
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
            formulaVersion: FORMULA_VERSION,
            modelId: model.id,
            rawInputs: {
              formulaVersion: FORMULA_VERSION,
              weights: DEFAULT_CODE_WEIGHTS,
              taskComplexityMultiplier,
              domainNormalizationFactor,
              modelPromptVersion:
                (model.config as Record<string, unknown>)?.promptVersion ?? 'unknown',
            },
            metadata: {
              rawModelOutput: result.rawModelOutput,
            },
            completedAt: new Date(),
          },
        });

        await this.auditService.log(
          {
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
              formulaVersion: FORMULA_VERSION,
            },
          },
          tx,
        );
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

      this.logger.log('Code evaluation completed', {
        module: 'evaluation',
        evaluationId,
        contributionId,
        compositeScore,
        correlationId,
      });
    } catch (error) {
      this.logger.error('Code evaluation failed', {
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

  private buildEvaluationInput(contribution: {
    id: string;
    contributionType: string;
    title: string;
    description: string | null;
    rawData: unknown;
    sourceRef: string;
    repository: { fullName: string };
  }): CodeEvaluationInput {
    const rawData = contribution.rawData as Record<string, unknown>;
    const files: CodeEvaluationInput['files'] = [];

    const rawFiles = (rawData?.files as Array<Record<string, unknown>>) ?? [];
    for (const file of rawFiles.slice(0, MAX_EVALUATION_FILES)) {
      let patch = (file.patch as string) ?? undefined;
      if (patch && patch.length > MAX_PATCH_LENGTH) {
        patch = patch.slice(0, MAX_PATCH_LENGTH) + '\n... [truncated]';
      }
      files.push({
        filename: (file.filename as string) ?? 'unknown',
        status: (file.status as string) ?? 'modified',
        additions: (file.additions as number) ?? 0,
        deletions: (file.deletions as number) ?? 0,
        patch,
      });
    }

    return {
      contributionId: contribution.id,
      contributionType: contribution.contributionType,
      repositoryName: contribution.repository.fullName,
      files,
      commitMessage:
        contribution.contributionType === 'COMMIT'
          ? ((rawData?.message as string) ?? contribution.title)
          : undefined,
      pullRequestTitle:
        contribution.contributionType === 'PULL_REQUEST' ? contribution.title : undefined,
      pullRequestDescription:
        contribution.contributionType === 'PULL_REQUEST'
          ? (contribution.description ?? undefined)
          : undefined,
    };
  }

  private computeComplexityMultiplier(files: CodeEvaluationInput['files']): number {
    const totalFiles = files.length;
    const totalLines = files.reduce((sum, f) => sum + f.additions + f.deletions, 0);

    if (totalFiles <= 3 && totalLines < 100) return 1.0;
    if (totalFiles <= 10 && totalLines < 500) return 1.05;
    if (totalFiles <= 30 && totalLines < 1500) return 1.1;
    return 1.15;
  }

  private computeCompositeScore(
    dimensions: Record<EvaluationDimensionKey, { score: number }>,
    taskComplexityMultiplier: number,
    domainNormalizationFactor: number,
  ): number {
    const weightedSum = (
      Object.entries(DEFAULT_CODE_WEIGHTS) as [EvaluationDimensionKey, number][]
    ).reduce((sum, [key, weight]) => sum + dimensions[key].score * weight, 0);
    return Math.min(
      100,
      Math.round(weightedSum * taskComplexityMultiplier * domainNormalizationFactor),
    );
  }
}

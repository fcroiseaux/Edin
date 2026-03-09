import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service.js';

export interface EvaluationDispatchJobData {
  evaluationId: string;
  contributionId: string;
  contributionType: string;
  contributorId: string;
  correlationId: string;
}

@Processor('evaluation-dispatch')
export class EvaluationDispatchProcessor extends WorkerHost {
  private readonly logger = new Logger(EvaluationDispatchProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('code-evaluation')
    private readonly codeEvaluationQueue: Queue,
    @InjectQueue('doc-evaluation')
    private readonly docEvaluationQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<EvaluationDispatchJobData>): Promise<void> {
    const { evaluationId, contributionId, contributionType, contributorId, correlationId } =
      job.data;

    this.logger.log('Processing evaluation dispatch', {
      module: 'evaluation',
      jobId: job.id,
      evaluationId,
      contributionId,
      contributionType,
      correlationId,
    });

    try {
      await this.prisma.evaluation.update({
        where: { id: evaluationId },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      });

      if (contributionType === 'COMMIT' || contributionType === 'PULL_REQUEST') {
        await this.codeEvaluationQueue.add(
          'evaluate-code',
          {
            evaluationId,
            contributionId,
            contributionType,
            contributorId,
            correlationId,
          },
          { jobId: `code-eval-${evaluationId}` },
        );

        this.logger.log('Routed to code-evaluation queue', {
          module: 'evaluation',
          evaluationId,
          contributionType,
          correlationId,
        });
      } else if (contributionType === 'DOCUMENTATION') {
        await this.docEvaluationQueue.add(
          'evaluate-doc',
          {
            evaluationId,
            contributionId,
            contributionType,
            contributorId,
            correlationId,
          },
          { jobId: `doc-eval-${evaluationId}` },
        );

        this.logger.log('Routed to doc-evaluation queue', {
          module: 'evaluation',
          evaluationId,
          contributionType,
          correlationId,
        });
      } else {
        this.logger.warn('Unknown contribution type for evaluation', {
          module: 'evaluation',
          evaluationId,
          contributionType,
          correlationId,
        });
      }
    } catch (error) {
      this.logger.error('Evaluation dispatch failed', {
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
}

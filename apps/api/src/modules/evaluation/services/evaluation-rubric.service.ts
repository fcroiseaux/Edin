import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { AuditService } from '../../compliance/audit/audit.service.js';

@Injectable()
export class EvaluationRubricService {
  private readonly logger = new Logger(EvaluationRubricService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getActiveRubric(evaluationType: string, documentType?: string) {
    const rubric = await this.prisma.evaluationRubric.findFirst({
      where: {
        evaluationType,
        isActive: true,
        documentType: documentType ?? null,
      },
      orderBy: { createdAt: 'desc' },
    });

    return rubric
      ? {
          id: rubric.id,
          evaluationType: rubric.evaluationType,
          documentType: rubric.documentType,
          parameters: rubric.parameters as Record<string, unknown>,
          version: rubric.version,
          isActive: rubric.isActive,
          createdAt: rubric.createdAt.toISOString(),
        }
      : null;
  }

  async listRubrics(evaluationType?: string) {
    const rubrics = await this.prisma.evaluationRubric.findMany({
      where: evaluationType ? { evaluationType } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    return rubrics.map((r) => ({
      id: r.id,
      evaluationType: r.evaluationType,
      documentType: r.documentType,
      parameters: r.parameters,
      version: r.version,
      isActive: r.isActive,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async createRubricVersion(
    data: {
      evaluationType: string;
      documentType?: string;
      parameters: Record<string, unknown>;
      version: string;
    },
    audit?: { actorId: string; correlationId: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Deactivate previous active rubrics of the same type
      await tx.evaluationRubric.updateMany({
        where: {
          evaluationType: data.evaluationType,
          documentType: data.documentType ?? null,
          isActive: true,
        },
        data: { isActive: false },
      });

      const rubric = await tx.evaluationRubric.create({
        data: {
          evaluationType: data.evaluationType,
          documentType: data.documentType ?? null,
          parameters: JSON.parse(JSON.stringify(data.parameters)) as Record<string, unknown>,
          version: data.version,
          isActive: true,
        },
      });

      if (audit) {
        await this.auditService.log(
          {
            actorId: audit.actorId,
            action: 'EVALUATION_RUBRIC_CREATED',
            entityType: 'EvaluationRubric',
            entityId: rubric.id,
            correlationId: audit.correlationId,
            details: {
              evaluationType: data.evaluationType,
              version: data.version,
            },
          },
          tx,
        );
      }

      this.logger.log('New rubric version created', {
        module: 'evaluation',
        rubricId: rubric.id,
        evaluationType: data.evaluationType,
        version: data.version,
      });

      return {
        id: rubric.id,
        evaluationType: rubric.evaluationType,
        documentType: rubric.documentType,
        parameters: rubric.parameters,
        version: rubric.version,
        isActive: rubric.isActive,
        createdAt: rubric.createdAt.toISOString(),
      };
    });
  }
}

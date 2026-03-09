import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import { ERROR_CODES } from '@edin/shared';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../../common/guards/ability.guard.js';
import { CheckAbility } from '../../../common/decorators/check-ability.decorator.js';
import { Action } from '../../auth/casl/action.enum.js';
import { createSuccessResponse } from '../../../common/types/api-response.type.js';
import { DomainException } from '../../../common/exceptions/domain.exception.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { EvaluationRubricService } from '../services/evaluation-rubric.service.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../../common/decorators/current-user.decorator.js';

@Controller({ path: 'admin/evaluations', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class EvaluationAdminController {
  private readonly logger = new Logger(EvaluationAdminController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rubricService: EvaluationRubricService,
  ) {}

  // ─── Model Registry Endpoints ──────────────────────────────────────────────

  @Get('models')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async listModels(@CurrentUser() user: CurrentUserPayload) {
    const correlationId = randomUUID();

    const models = await this.prisma.evaluationModel.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const modelIds = models.map((m) => m.id);
    const evaluationCounts = await this.prisma.evaluation.groupBy({
      by: ['modelId'],
      where: { modelId: { in: modelIds } },
      _count: { id: true },
    });

    const countMap = new Map(evaluationCounts.map((e) => [e.modelId, e._count.id]));

    const data = models.map((m) => ({
      id: m.id,
      name: m.name,
      version: m.version,
      provider: m.provider,
      status: m.status,
      configHash: m.configHash,
      deployedAt: m.deployedAt?.toISOString() ?? null,
      retiredAt: m.retiredAt?.toISOString() ?? null,
      evaluationCount: countMap.get(m.id) ?? 0,
      createdAt: m.createdAt.toISOString(),
    }));

    this.logger.debug('Listed evaluation models', {
      module: 'evaluation',
      userId: user.id,
      count: data.length,
      correlationId,
    });

    return createSuccessResponse(data, correlationId);
  }

  @Get('models/:id/metrics')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async getModelMetrics(@Param('id') id: string) {
    const correlationId = randomUUID();

    const model = await this.prisma.evaluationModel.findUnique({ where: { id } });
    if (!model) {
      throw new DomainException(
        ERROR_CODES.EVALUATION_MODEL_NOT_FOUND,
        'Evaluation model not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const evaluations = await this.prisma.evaluation.findMany({
      where: { modelId: id, status: 'COMPLETED' },
      select: { compositeScore: true },
    });

    const scores = evaluations
      .map((e) => e.compositeScore?.toNumber())
      .filter((s): s is number => s !== null && s !== undefined);

    const evaluationCount = scores.length;
    const averageScore =
      evaluationCount > 0 ? scores.reduce((a, b) => a + b, 0) / evaluationCount : null;

    let scoreVariance: number | null = null;
    if (evaluationCount > 1 && averageScore !== null) {
      const sumSquaredDiffs = scores.reduce(
        (sum, score) => sum + Math.pow(score - averageScore, 2),
        0,
      );
      scoreVariance = sumSquaredDiffs / (evaluationCount - 1);
    }

    const data = {
      modelId: model.id,
      modelName: model.name,
      modelVersion: model.version,
      evaluationCount,
      averageScore: averageScore !== null ? Math.round(averageScore * 100) / 100 : null,
      scoreVariance: scoreVariance !== null ? Math.round(scoreVariance * 100) / 100 : null,
      humanAgreementRate: null as number | null,
    };

    return createSuccessResponse(data, correlationId);
  }

  @Post('models')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async registerModel(
    @Body()
    body: {
      name: string;
      version: string;
      provider: string;
      config?: Record<string, unknown>;
    },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const correlationId = randomUUID();

    if (!body.name || !body.version || !body.provider) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'name, version, and provider are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const configHash = body.config
      ? createHash('sha256').update(JSON.stringify(body.config)).digest('hex')
      : null;

    const model = await this.prisma.$transaction(async (tx) => {
      const created = await tx.evaluationModel.create({
        data: {
          id: randomUUID(),
          name: body.name,
          version: body.version,
          provider: body.provider,
          config: body.config ?? null,
          configHash,
          status: 'ACTIVE',
          deployedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'EVALUATION_MODEL_REGISTERED',
          entityType: 'EvaluationModel',
          entityId: created.id,
          correlationId,
          details: {
            name: body.name,
            version: body.version,
            provider: body.provider,
          },
        },
      });

      return created;
    });

    this.logger.log('Evaluation model registered', {
      module: 'evaluation',
      modelId: model.id,
      name: model.name,
      version: model.version,
      userId: user.id,
      correlationId,
    });

    return createSuccessResponse(
      {
        id: model.id,
        name: model.name,
        version: model.version,
        provider: model.provider,
        status: model.status,
        configHash: model.configHash,
        deployedAt: model.deployedAt?.toISOString() ?? null,
        retiredAt: model.retiredAt,
        evaluationCount: 0,
        createdAt: model.createdAt.toISOString(),
      },
      correlationId,
    );
  }

  @Patch('models/:id')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async updateModelStatus(
    @Param('id') id: string,
    @Body() body: { status: 'ACTIVE' | 'DEPRECATED' | 'RETIRED' },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const correlationId = randomUUID();

    const model = await this.prisma.evaluationModel.findUnique({ where: { id } });
    if (!model) {
      throw new DomainException(
        ERROR_CODES.EVALUATION_MODEL_NOT_FOUND,
        'Evaluation model not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const validStatuses = ['ACTIVE', 'DEPRECATED', 'RETIRED'];
    if (!body.status || !validStatuses.includes(body.status)) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        `status must be one of: ${validStatuses.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const updatedModel = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.evaluationModel.update({
        where: { id },
        data: {
          status: body.status,
          ...(body.status === 'RETIRED' ? { retiredAt: new Date() } : {}),
          ...(body.status === 'ACTIVE' ? { deployedAt: new Date() } : {}),
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'EVALUATION_MODEL_STATUS_CHANGED',
          entityType: 'EvaluationModel',
          entityId: id,
          correlationId,
          details: {
            previousStatus: model.status,
            newStatus: body.status,
          },
        },
      });

      return updated;
    });

    this.logger.log('Evaluation model status updated', {
      module: 'evaluation',
      modelId: id,
      previousStatus: model.status,
      newStatus: body.status,
      userId: user.id,
      correlationId,
    });

    return createSuccessResponse(
      {
        id: updatedModel.id,
        name: updatedModel.name,
        version: updatedModel.version,
        provider: updatedModel.provider,
        status: updatedModel.status,
        configHash: updatedModel.configHash,
        deployedAt: updatedModel.deployedAt?.toISOString() ?? null,
        retiredAt: updatedModel.retiredAt?.toISOString() ?? null,
        createdAt: updatedModel.createdAt.toISOString(),
      },
      correlationId,
    );
  }

  // ─── Rubric Endpoints ─────────────────────────────────────────────────────

  @Get('rubrics')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async listRubrics(@Query('evaluationType') evaluationType?: string) {
    const correlationId = randomUUID();
    const data = await this.rubricService.listRubrics(evaluationType);
    return createSuccessResponse(data, correlationId);
  }

  @Post('rubrics')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async createRubric(
    @Body()
    body: {
      evaluationType: string;
      documentType?: string;
      parameters: Record<string, unknown>;
      version: string;
    },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const correlationId = randomUUID();

    if (!body.evaluationType || !body.parameters || !body.version) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'evaluationType, parameters, and version are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const rubric = await this.rubricService.createRubricVersion(
      {
        evaluationType: body.evaluationType,
        documentType: body.documentType,
        parameters: body.parameters,
        version: body.version,
      },
      {
        actorId: user.id,
        correlationId,
      },
    );

    this.logger.log('Evaluation rubric created', {
      module: 'evaluation',
      rubricId: rubric.id,
      evaluationType: body.evaluationType,
      version: body.version,
      userId: user.id,
      correlationId,
    });

    return createSuccessResponse(rubric, correlationId);
  }
}

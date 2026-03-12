import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Inject,
  UseGuards,
  Logger,
  HttpStatus,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
import { ERROR_CODES, resolveReviewSchema, reviewQueueQuerySchema } from '@edin/shared';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard.js';
import { AbilityGuard } from '../../../common/guards/ability.guard.js';
import { CheckAbility } from '../../../common/decorators/check-ability.decorator.js';
import { Action } from '../../auth/casl/action.enum.js';
import { createSuccessResponse } from '../../../common/types/api-response.type.js';
import { DomainException } from '../../../common/exceptions/domain.exception.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { AuditService } from '../../compliance/audit/audit.service.js';
import { EvaluationRubricService } from '../services/evaluation-rubric.service.js';
import { EvaluationReviewService } from '../services/evaluation-review.service.js';
import {
  EVALUATION_PROVIDER,
  type EvaluationProvider,
} from '../providers/evaluation-provider.interface.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../../common/decorators/current-user.decorator.js';

@Controller({ path: 'admin/evaluations', version: '1' })
@UseGuards(JwtAuthGuard, AbilityGuard)
export class EvaluationAdminController {
  private readonly logger = new Logger(EvaluationAdminController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rubricService: EvaluationRubricService,
    private readonly reviewService: EvaluationReviewService,
    private readonly auditService: AuditService,
    @Inject(EVALUATION_PROVIDER)
    private readonly evaluationProvider: EvaluationProvider,
  ) {}

  // ─── Model Registry Endpoints ──────────────────────────────────────────────

  @Get('available-models')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async listAvailableModels() {
    const correlationId = randomUUID();

    try {
      const models = await this.evaluationProvider.listAvailableModels();

      this.logger.debug('Listed available Anthropic models', {
        module: 'evaluation',
        count: models.length,
        correlationId,
      });

      return createSuccessResponse(models, correlationId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error fetching models';

      this.logger.warn('Failed to fetch available models from Anthropic API', {
        module: 'evaluation',
        error: message,
        correlationId,
      });

      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        `Anthropic API unavailable: ${message}`,
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

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
      apiModelId: m.apiModelId,
      evaluationType: m.evaluationType,
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

    // Calculate human agreement rate from resolved reviews for this model
    const agreementRates = await this.reviewService.getAgreementRates(id);
    const modelAgreement = agreementRates.byModel.find((m) => m.modelId === id);
    const humanAgreementRate = modelAgreement ? modelAgreement.agreementRate : null;

    const data = {
      modelId: model.id,
      modelName: model.name,
      modelVersion: model.version,
      evaluationCount,
      averageScore: averageScore !== null ? Math.round(averageScore * 100) / 100 : null,
      scoreVariance: scoreVariance !== null ? Math.round(scoreVariance * 100) / 100 : null,
      humanAgreementRate,
    };

    return createSuccessResponse(data, correlationId);
  }

  @Post('models')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async registerModel(
    @Body()
    body: {
      apiModelId: string;
      evaluationType: string;
      version: string;
      name?: string;
      provider?: string;
      config?: Record<string, unknown>;
    },
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const correlationId = randomUUID();

    if (!body.apiModelId || !body.evaluationType || !body.version) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'apiModelId, evaluationType, and version are required',
        HttpStatus.BAD_REQUEST,
      );
    }

    const validTypes = ['CODE', 'DOCUMENTATION'];
    if (!validTypes.includes(body.evaluationType)) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        `evaluationType must be one of: ${validTypes.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const displayName = body.name || body.apiModelId;
    const provider = body.provider || 'anthropic';

    const configHash = body.config
      ? createHash('sha256').update(JSON.stringify(body.config)).digest('hex')
      : null;

    const model = await this.prisma.$transaction(async (tx) => {
      const created = await tx.evaluationModel.create({
        data: {
          id: randomUUID(),
          name: displayName,
          version: body.version,
          provider,
          apiModelId: body.apiModelId,
          evaluationType: body.evaluationType,
          config: (body.config ?? undefined) as
            | import('../../../../generated/prisma/client/client.js').Prisma.InputJsonValue
            | undefined,
          configHash,
          status: 'ACTIVE',
          deployedAt: new Date(),
        },
      });

      await this.auditService.log(
        {
          actorId: user.id,
          action: 'EVALUATION_MODEL_REGISTERED',
          entityType: 'EvaluationModel',
          entityId: created.id,
          correlationId,
          details: {
            apiModelId: body.apiModelId,
            evaluationType: body.evaluationType,
            name: displayName,
            version: body.version,
            provider,
          },
        },
        tx,
      );

      return created;
    });

    this.logger.log('Evaluation model registered', {
      module: 'evaluation',
      modelId: model.id,
      apiModelId: model.apiModelId,
      evaluationType: model.evaluationType,
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
        apiModelId: model.apiModelId,
        evaluationType: model.evaluationType,
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

      await this.auditService.log(
        {
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
        tx,
      );

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
        apiModelId: updatedModel.apiModelId,
        evaluationType: updatedModel.evaluationType,
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

  // ─── Review Queue Endpoints ──────────────────────────────────────────────

  @Get('reviews')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async listReviews(@Query() query: Record<string, unknown>) {
    const correlationId = randomUUID();
    const parsed = reviewQueueQuerySchema.safeParse(query);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid query parameters',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e: { path: (string | number)[]; message: string }) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const result = await this.reviewService.getReviewQueue(parsed.data);

    this.logger.debug('Listed evaluation reviews', {
      module: 'evaluation',
      count: result.items.length,
      correlationId,
    });

    return createSuccessResponse(result.items, correlationId, result.pagination);
  }

  @Get('reviews/:id')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async getReviewDetail(@Param('id') id: string) {
    const correlationId = randomUUID();
    const result = await this.reviewService.getReviewDetail(id);
    return createSuccessResponse(result, correlationId);
  }

  @Post('reviews/:id/resolve')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async resolveReview(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const correlationId = randomUUID();
    const parsed = resolveReviewSchema.safeParse(body);

    if (!parsed.success) {
      throw new DomainException(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid resolve request',
        HttpStatus.BAD_REQUEST,
        parsed.error.errors.map((e: { path: (string | number)[]; message: string }) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      );
    }

    const result = await this.reviewService.resolveReview(
      id,
      user.id,
      parsed.data.action,
      parsed.data.reviewReason,
      parsed.data.overrideScores,
      parsed.data.overrideNarrative,
      correlationId,
    );

    this.logger.log('Evaluation review resolved', {
      module: 'evaluation',
      reviewId: id,
      action: parsed.data.action,
      userId: user.id,
      correlationId,
    });

    return createSuccessResponse(result, correlationId);
  }

  @Get('agreement-rates')
  @CheckAbility((ability) => ability.can(Action.Manage, 'all'))
  async getAgreementRates(@Query('modelId') modelId?: string) {
    const correlationId = randomUUID();
    const result = await this.reviewService.getAgreementRates(modelId);
    return createSuccessResponse(result, correlationId);
  }
}

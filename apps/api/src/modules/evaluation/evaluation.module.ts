import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { CaslModule } from '../auth/casl/casl.module.js';
import { RedisModule } from '../../common/redis/redis.module.js';
import { SprintModule } from '../sprint/sprint.module.js';
import { ZenhubModule } from '../zenhub/zenhub.module.js';
import { ActivityModule } from '../activity/activity.module.js';
import { NotificationModule } from '../notification/notification.module.js';
import { EvaluationController } from './evaluation.controller.js';
import { EvaluationAdminController } from './controllers/evaluation-admin.controller.js';
import { EvaluationPublicController } from './controllers/evaluation-public.controller.js';
import { EvaluationService } from './evaluation.service.js';
import { EvaluationRubricService } from './services/evaluation-rubric.service.js';
import { EvaluationReviewService } from './services/evaluation-review.service.js';
import { CombinedEvaluationService } from './services/combined-evaluation.service.js';
import { EvaluationDispatchProcessor } from './processors/evaluation-dispatch.processor.js';
import { CodeEvaluationProcessor } from './processors/code-evaluation.processor.js';
import { DocEvaluationProcessor } from './processors/doc-evaluation.processor.js';
import { EvaluationModelRegistry } from './models/evaluation-model.registry.js';
import { TrackRecordComputeService } from './services/track-record-compute.service.js';
import { MilestoneDetectionService } from './services/milestone-detection.service.js';
import { TrackRecordSchedulerService } from './services/track-record-scheduler.service.js';
import { TrackRecordProcessor } from './processors/track-record.processor.js';
import { TrackRecordOutcomeService } from './services/track-record-outcome.service.js';
import { TrackRecordController } from './controllers/track-record.controller.js';
import { TrackRecordPublicController } from './controllers/track-record-public.controller.js';
import { TrackRecordAdminController } from './controllers/track-record-admin.controller.js';
import { AnthropicEvaluationProvider } from './providers/anthropic-evaluation.provider.js';
import { EVALUATION_PROVIDER } from './providers/evaluation-provider.interface.js';

@Module({
  imports: [
    PrismaModule,
    CaslModule,
    RedisModule,
    SprintModule,
    ZenhubModule,
    ActivityModule,
    NotificationModule,
    BullModule.registerQueue({
      name: 'evaluation-dispatch',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      },
    }),
    BullModule.registerQueue({
      name: 'code-evaluation',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 2000 },
      },
    }),
    BullModule.registerQueue({
      name: 'doc-evaluation',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 2000 },
      },
    }),
    BullModule.registerQueue({
      name: 'track-record',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 500 },
      },
    }),
  ],
  controllers: [
    EvaluationController,
    EvaluationAdminController,
    EvaluationPublicController,
    TrackRecordController,
    TrackRecordPublicController,
    TrackRecordAdminController,
  ],
  providers: [
    EvaluationService,
    EvaluationRubricService,
    EvaluationReviewService,
    CombinedEvaluationService,
    EvaluationDispatchProcessor,
    CodeEvaluationProcessor,
    DocEvaluationProcessor,
    EvaluationModelRegistry,
    TrackRecordComputeService,
    MilestoneDetectionService,
    TrackRecordSchedulerService,
    TrackRecordProcessor,
    TrackRecordOutcomeService,
    {
      provide: EVALUATION_PROVIDER,
      useClass: AnthropicEvaluationProvider,
    },
  ],
  exports: [
    EvaluationService,
    EvaluationReviewService,
    CombinedEvaluationService,
    TrackRecordComputeService,
    MilestoneDetectionService,
    TrackRecordOutcomeService,
  ],
})
export class EvaluationModule {}

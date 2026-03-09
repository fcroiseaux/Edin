import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { CaslModule } from '../auth/casl/casl.module.js';
import { RedisModule } from '../../common/redis/redis.module.js';
import { FeedbackController } from './feedback.controller.js';
import { FeedbackAdminController } from './feedback-admin.controller.js';
import { FeedbackService } from './feedback.service.js';
import { FeedbackAssignmentProcessor } from './feedback-assignment.processor.js';

@Module({
  imports: [
    PrismaModule,
    CaslModule,
    RedisModule,
    BullModule.registerQueue({
      name: 'feedback-assignment',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    BullModule.registerQueue({
      name: 'feedback-assignment-dlq',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [FeedbackController, FeedbackAdminController],
  providers: [FeedbackService, FeedbackAssignmentProcessor],
  exports: [FeedbackService],
})
export class FeedbackModule {}

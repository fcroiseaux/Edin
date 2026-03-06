import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { CaslModule } from '../auth/casl/casl.module.js';
import { IngestionController } from './ingestion.controller.js';
import { IngestionService } from './ingestion.service.js';
import { GitHubApiService } from './github-api.service.js';
import { WebhookProcessor } from './processors/webhook.processor.js';
import { ContributionAttributionService } from './services/contribution-attribution.service.js';
import { ContributionController } from './contribution.controller.js';
import { ContributionSseController } from './contribution-sse.controller.js';
import { ContributionSseService } from './contribution-sse.service.js';
import type { AppConfig } from '../../config/app.config.js';

@Module({
  imports: [
    PrismaModule,
    CaslModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => {
        const redisUrl = new URL(configService.get('REDIS_URL', { infer: true }));
        return {
          connection: {
            host: redisUrl.hostname,
            port: Number(redisUrl.port) || 6379,
            ...(redisUrl.password && { password: decodeURIComponent(redisUrl.password) }),
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: 'github-ingestion',
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
      name: 'github-ingestion-dlq',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [IngestionController, ContributionController, ContributionSseController],
  providers: [
    IngestionService,
    GitHubApiService,
    WebhookProcessor,
    ContributionAttributionService,
    ContributionSseService,
  ],
  exports: [IngestionService],
})
export class IngestionModule {}

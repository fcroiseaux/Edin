import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { ZenhubConfigController } from './zenhub-config.controller.js';
import { ZenhubConfigService } from './zenhub-config.service.js';
import { ZenhubWebhookController } from './zenhub-webhook.controller.js';
import { ZenhubWebhookService } from './zenhub-webhook.service.js';
import { ZenhubGraphqlClient } from './zenhub-graphql.client.js';
import { ZenhubPollingService } from './zenhub-polling.service.js';
import { ZenhubPollingProcessor } from './zenhub-polling.processor.js';
import { ZenhubBackfillController } from './zenhub-backfill.controller.js';
import { ZenhubBackfillService } from './zenhub-backfill.service.js';

@Module({
  imports: [
    PrismaModule,
    SettingsModule,
    BullModule.registerQueue({
      name: 'zenhub-polling',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60_000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    BullModule.registerQueue({
      name: 'zenhub-polling-dlq',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [ZenhubConfigController, ZenhubWebhookController, ZenhubBackfillController],
  providers: [
    ZenhubConfigService,
    ZenhubWebhookService,
    ZenhubGraphqlClient,
    ZenhubPollingService,
    ZenhubPollingProcessor,
    ZenhubBackfillService,
  ],
  exports: [ZenhubConfigService, ZenhubWebhookService, ZenhubPollingService, ZenhubBackfillService],
})
export class ZenhubModule {}

import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { ArticleController } from './article.controller.js';
import { EditorialController } from './editorial.controller.js';
import { EditorEligibilityController } from './editor-eligibility.controller.js';
import { PublicArticleController } from './public-article.controller.js';
import { ArticleMetricsController } from './article-metrics.controller.js';
import { ModerationAdminController } from './moderation-admin.controller.js';
import { ArticleService } from './article.service.js';
import { EditorialService } from './editorial.service.js';
import { EditorEligibilityService } from './editor-eligibility.service.js';
import { ArticleMetricsService } from './article-metrics.service.js';
import { ArticleRewardService } from './article-reward.service.js';
import { FileImportService } from './file-import.service.js';
import { ModerationService } from './moderation.service.js';
import { PlagiarismCheckProcessor } from './plagiarism-check.processor.js';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'plagiarism-check',
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
      name: 'plagiarism-check-dlq',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [
    ArticleController,
    EditorialController,
    EditorEligibilityController,
    PublicArticleController,
    ArticleMetricsController,
    ModerationAdminController,
  ],
  providers: [
    ArticleService,
    FileImportService,
    EditorialService,
    EditorEligibilityService,
    ArticleMetricsService,
    ArticleRewardService,
    ModerationService,
    PlagiarismCheckProcessor,
  ],
  exports: [
    ArticleService,
    EditorialService,
    EditorEligibilityService,
    ArticleMetricsService,
    ArticleRewardService,
    ModerationService,
  ],
})
export class PublicationModule {}

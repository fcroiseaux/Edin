import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuditService } from './audit/audit.service.js';
import { GdprService } from './gdpr/gdpr.service.js';
import { GdprController } from './gdpr/gdpr.controller.js';
import { DataExportProcessor } from './gdpr/data-export.processor.js';
import { DataDeletionProcessor } from './gdpr/data-deletion.processor.js';
import { EuAiActService } from './eu-ai-act/eu-ai-act.service.js';
import { EuAiActController } from './eu-ai-act/eu-ai-act.controller.js';

@Global()
@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue(
      {
        name: 'gdpr-export',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: 'gdpr-deletion',
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
    ),
  ],
  controllers: [GdprController, EuAiActController],
  providers: [
    AuditService,
    GdprService,
    DataExportProcessor,
    DataDeletionProcessor,
    EuAiActService,
  ],
  exports: [AuditService, GdprService, EuAiActService],
})
export class ComplianceModule {}

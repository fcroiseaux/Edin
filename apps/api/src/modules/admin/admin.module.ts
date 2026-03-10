import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { HealthMetricsController } from './health-metrics.controller.js';
import { HealthMetricsService } from './health-metrics.service.js';
import { AlertsService } from './alerts.service.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { ReportsProcessor } from './reports.processor.js';
import { AdminContributorsController } from './contributors.controller.js';
import { AdminContributorsService } from './contributors.service.js';
import { AdminSettingsController } from './settings.controller.js';
import { SettingsAdminService } from './settings-admin.service.js';
import { AuditLogsController } from './audit-logs.controller.js';
import { AuditLogsService } from './audit-logs.service.js';

@Module({
  imports: [
    PrismaModule,
    SettingsModule,
    BullModule.registerQueue({
      name: 'admin-reports',
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: { age: 30 * 24 * 60 * 60 },
        removeOnFail: false,
      },
    }),
  ],
  controllers: [
    AuditLogsController,
    AdminSettingsController,
    AdminContributorsController,
    HealthMetricsController,
    ReportsController,
  ],
  providers: [
    HealthMetricsService,
    AlertsService,
    ReportsService,
    ReportsProcessor,
    AdminContributorsService,
    SettingsAdminService,
    AuditLogsService,
  ],
  exports: [HealthMetricsService],
})
export class AdminModule {}

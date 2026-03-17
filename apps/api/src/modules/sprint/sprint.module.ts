import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { SettingsModule } from '../settings/settings.module.js';
import { SprintMetricsService } from './sprint-metrics.service.js';
import { SprintMetricsController } from './sprint-metrics.controller.js';
import { SprintEnrichmentService } from './sprint-enrichment.service.js';
import { SprintEnrichmentController } from './sprint-enrichment.controller.js';
import { SprintPlanningReliabilityService } from './sprint-planning-reliability.service.js';
import { SprintPlanningReliabilityController } from './sprint-planning-reliability.controller.js';
import { SprintPersonalMetricsController } from './sprint-personal-metrics.controller.js';
import { SprintLifecycleService } from './sprint-lifecycle.service.js';

@Module({
  imports: [PrismaModule, SettingsModule],
  controllers: [
    SprintMetricsController,
    SprintEnrichmentController,
    SprintPlanningReliabilityController,
    SprintPersonalMetricsController,
  ],
  providers: [
    SprintMetricsService,
    SprintEnrichmentService,
    SprintPlanningReliabilityService,
    SprintLifecycleService,
  ],
  exports: [
    SprintMetricsService,
    SprintEnrichmentService,
    SprintPlanningReliabilityService,
    SprintLifecycleService,
  ],
})
export class SprintModule {}

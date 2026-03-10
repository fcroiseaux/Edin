import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import type { IncomingMessage, ServerResponse } from 'http';
import { randomUUID } from 'crypto';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module.js';
import { RedisModule } from './common/redis/redis.module.js';
import { HealthModule } from './modules/health/health.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ContributorModule } from './modules/contributor/contributor.module.js';
import { ShowcaseModule } from './modules/showcase/showcase.module.js';
import { AdmissionModule } from './modules/admission/admission.module.js';
import { IngestionModule } from './modules/ingestion/ingestion.module.js';
import { WorkingGroupModule } from './modules/working-group/working-group.module.js';
import { TaskModule } from './modules/task/task.module.js';
import { ActivityModule } from './modules/activity/activity.module.js';
import { NotificationModule } from './modules/notification/notification.module.js';
import { FeedbackModule } from './modules/feedback/feedback.module.js';
import { EvaluationModule } from './modules/evaluation/evaluation.module.js';
import { PublicationModule } from './modules/publication/publication.module.js';
import { RewardModule } from './modules/reward/reward.module.js';
import { AdminModule } from './modules/admin/admin.module.js';
import { ComplianceModule } from './modules/compliance/compliance.module.js';
import { validateConfig } from './config/app.config.js';
import type { AppConfig } from './config/app.config.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.development'],
      validate: validateConfig,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req: IncomingMessage & { correlationId?: string }, res: ServerResponse) => {
          const headerValue = req.headers['x-correlation-id'];
          const correlationId =
            typeof headerValue === 'string' && headerValue.trim().length > 0
              ? headerValue
              : randomUUID();

          req.correlationId = correlationId;
          res.setHeader('x-correlation-id', correlationId);

          return correlationId;
        },
        level: process.env.LOG_LEVEL || 'info',
        transport:
          process.env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        customProps: (req: IncomingMessage & { correlationId?: string }) => ({
          correlationId: req.correlationId,
        }),
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie'],
          remove: true,
        },
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    EventEmitterModule.forRoot(),
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
    PrismaModule,
    ComplianceModule,
    RedisModule,
    HealthModule,
    AuthModule,
    ContributorModule,
    ShowcaseModule,
    AdmissionModule,
    IngestionModule,
    WorkingGroupModule,
    TaskModule,
    ActivityModule,
    NotificationModule,
    FeedbackModule,
    EvaluationModule,
    PublicationModule,
    RewardModule,
    AdminModule,
  ],
})
export class AppModule {}

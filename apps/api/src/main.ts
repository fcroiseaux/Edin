import './instrument.js';
import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter.js';
import { CorrelationIdInterceptor } from './common/interceptors/correlation-id.interceptor.js';
import { ResponseWrapperInterceptor } from './common/interceptors/response-wrapper.interceptor.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { validateConfig } from './config/app.config.js';

async function bootstrap() {
  const config = validateConfig();

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  // Pino logger
  app.useLogger(app.get(Logger));

  // Security & middleware
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config.NODE_ENV === 'production' ? config.FRONTEND_URL : true,
    credentials: true,
  });

  // API versioning: /api/v1/...
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Global interceptors
  app.useGlobalInterceptors(
    new CorrelationIdInterceptor(),
    new LoggingInterceptor(),
    new ResponseWrapperInterceptor(),
  );

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger / OpenAPI
  if (config.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Edin API')
      .setDescription('Edin contributor platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(config.API_PORT, config.API_HOST);

  const logger = app.get(Logger);
  logger.log(`Edin API running on http://${config.API_HOST}:${config.API_PORT}`, 'Bootstrap');
  logger.log(`Swagger docs at http://${config.API_HOST}:${config.API_PORT}/api/docs`, 'Bootstrap');
}

void bootstrap();
